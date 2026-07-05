import { Router } from 'express';
import { prisma } from '../prisma';
import { asyncHandler, HttpError } from '../lib/http';
import { productListQuery } from '../schemas';
import { computeFacets, productInclude, toApiProduct } from '../lib/mappers';
import { ProductListResponse } from '../contract';

export const productsRouter = Router();

// GET /products — filter (category/color/size) + sort + paginate + facets.
productsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const q = productListQuery.parse(req.query);
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 8;

    // Load the catalog once and apply the contract's filter/sort/pagination in
    // memory — identical semantics to the MSW reference implementation.
    const all = await prisma.product.findMany({
      include: productInclude,
      orderBy: { position: 'asc' },
    });

    let list = all.filter((p) => {
      const matchesCategory = !q.category || p.category.name === q.category;
      const matchesColor = !q.color || p.variants.some((v) => v.colorId === q.color);
      const matchesSize = !q.size || p.variants.some((v) => v.size === q.size);
      return matchesCategory && matchesColor && matchesSize;
    });
    if (q.sort === 'price-asc') list = [...list].sort((a, b) => a.price - b.price);
    if (q.sort === 'price-desc') list = [...list].sort((a, b) => b.price - a.price);

    const total = list.length;
    const items = list.slice((page - 1) * pageSize, page * pageSize).map(toApiProduct);

    const body: ProductListResponse = {
      items,
      total,
      page,
      pageSize,
      facets: computeFacets(all),
    };
    res.json(body);
  })
);

// GET /products/:idOrSlug — resolvable by id or slug; 404 otherwise.
productsRouter.get(
  '/:idOrSlug',
  asyncHandler(async (req, res) => {
    const { idOrSlug } = req.params;
    const product = await prisma.product.findFirst({
      where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
      include: productInclude,
    });
    if (!product) throw new HttpError(404, 'Product not found');
    res.json(toApiProduct(product));
  })
);
