import { Router } from 'express';
import { prisma } from '../prisma';
import { asyncHandler, HttpError } from '../lib/http';
import { productListQuery } from '../schemas';
import { computeFacets, productInclude, toApiProduct, ProductWithRelations } from '../lib/mappers';
import { ProductListResponse } from '../contract';

export const productsRouter = Router();

// GET /products — filter (q/category/color/size/price) + sort + paginate + facets.
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

    // One predicate per filter, so each refinement facet can re-run the set
    // MINUS its own (see computeFacets / docs/API_CONTRACT.md).
    // q: case-insensitive substring on name OR category (parity with admin search).
    const needle = q.q?.trim().toLowerCase();
    const okQ = (p: ProductWithRelations) =>
      !needle ||
      p.name.toLowerCase().includes(needle) ||
      p.category.name.toLowerCase().includes(needle);
    const okCategory = (p: ProductWithRelations) => !q.category || p.category.name === q.category;
    const okColor = (p: ProductWithRelations) =>
      !q.color || p.variants.some((v) => v.colorId === q.color);
    const okSize = (p: ProductWithRelations) => !q.size || p.variants.some((v) => v.size === q.size);
    // Inclusive bounds; an absent maxPrice means no upper bound.
    const okPrice = (p: ProductWithRelations) =>
      (q.minPrice === undefined || p.price >= q.minPrice) &&
      (q.maxPrice === undefined || p.price <= q.maxPrice);

    let list = all.filter((p) => okQ(p) && okCategory(p) && okColor(p) && okSize(p) && okPrice(p));
    if (q.sort === 'price-asc') list = [...list].sort((a, b) => a.price - b.price);
    if (q.sort === 'price-desc') list = [...list].sort((a, b) => b.price - a.price);

    const total = list.length;
    const items = list.slice((page - 1) * pageSize, page * pageSize).map(toApiProduct);

    const body: ProductListResponse = {
      items,
      total,
      page,
      pageSize,
      facets: computeFacets(all, {
        forColors: all.filter((p) => okQ(p) && okCategory(p) && okSize(p) && okPrice(p)),
        forSizes: all.filter((p) => okQ(p) && okCategory(p) && okColor(p) && okPrice(p)),
        forPrice: all.filter((p) => okQ(p) && okCategory(p) && okColor(p) && okSize(p)),
      }),
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
