import { randomUUID } from 'node:crypto';
import { Response, Router } from 'express';
import { prisma } from '../prisma';
import { asyncHandler, HttpError } from '../lib/http';
import { slugify } from '../lib/slug';
import { imageStore } from '../lib/imageStore';
import { productInclude, toAdminProduct, toApiProduct } from '../lib/mappers';
import {
  bulkIdsBody,
  bulkStatusBody,
  createProductBody,
  updateProductBody,
} from '../schemas';

export const adminProductsRouter = Router();

type ColorInput = { id: string; name: string; hex: string };
type VariantInput = { colorId: string; size: string; stock: number };
type ImageInput = { url: string; publicId?: string | null; alt?: string };

async function upsertColors(colors: ColorInput[]): Promise<void> {
  for (const c of colors) {
    await prisma.color.upsert({
      where: { id: c.id },
      create: { id: c.id, name: c.name, hex: c.hex },
      update: { name: c.name, hex: c.hex },
    });
  }
}

async function uniqueSlug(name: string): Promise<string> {
  const base = slugify(name) || 'product';
  const existing = await prisma.product.findUnique({ where: { slug: base } });
  return existing ? `${base}-${randomUUID().slice(0, 6)}` : base;
}

const imageCreate = (images: ImageInput[]) =>
  images.map((img, i) => ({
    imageId: String(i),
    src: img.url,
    alt: img.alt ?? '',
    publicId: img.publicId ?? null,
    position: i,
  }));

const variantCreate = (variants: VariantInput[]) =>
  variants.map((v, i) => ({ colorId: v.colorId, size: v.size, stock: v.stock, position: i }));

async function returnProduct(res: Response, id: string, status = 200): Promise<void> {
  const product = await prisma.product.findUnique({ where: { id }, include: productInclude });
  if (!product) throw new HttpError(404, 'Product not found');
  res.status(status).json(toApiProduct(product));
}

async function deleteProductWithImages(id: string): Promise<boolean> {
  const product = await prisma.product.findUnique({ where: { id }, include: { images: true } });
  if (!product) return false;
  for (const img of product.images) {
    if (img.publicId) await imageStore.destroy(img.publicId).catch(() => undefined);
  }
  await prisma.product.delete({ where: { id } }); // cascades images + variants
  return true;
}

// POST /admin/products — create.
adminProductsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const input = createProductBody.parse(req.body);
    await upsertColors(input.colors);
    const category = await prisma.category.upsert({
      where: { name: input.category },
      create: { name: input.category },
      update: {},
    });
    const max = await prisma.product.aggregate({ _max: { position: true } });
    const id = randomUUID();

    await prisma.product.create({
      data: {
        id,
        position: (max._max.position ?? -1) + 1,
        slug: await uniqueSlug(input.name),
        name: input.name,
        price: input.price,
        description: input.description,
        sku: input.sku ?? null,
        variantLabel: input.variant ?? null,
        badge: input.badge ?? null,
        status: input.status ?? null,
        stock: input.stock ?? null,
        categoryId: category.id,
        images: { create: imageCreate(input.images) },
        variants: { create: variantCreate(input.variants) },
      },
    });
    await returnProduct(res, id, 201);
  })
);

// Bulk routes are declared BEFORE /:id so they aren't captured as an id.

// POST /admin/products/bulk-delete — delete many.
adminProductsRouter.post(
  '/bulk-delete',
  asyncHandler(async (req, res) => {
    const { ids } = bulkIdsBody.parse(req.body);
    let count = 0;
    for (const id of ids) if (await deleteProductWithImages(id)) count += 1;
    res.json({ ok: true, count });
  })
);

// PATCH /admin/products/bulk-status — change status for many.
adminProductsRouter.patch(
  '/bulk-status',
  asyncHandler(async (req, res) => {
    const { ids, status } = bulkStatusBody.parse(req.body);
    const result = await prisma.product.updateMany({ where: { id: { in: ids } }, data: { status } });
    res.json({ ok: true, count: result.count });
  })
);

// PATCH /admin/products/:id — edit (replaces variants/images when provided).
adminProductsRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const input = updateProductBody.parse(req.body);
    const existing = await prisma.product.findUnique({ where: { id }, include: { images: true } });
    if (!existing) throw new HttpError(404, 'Product not found');

    if (input.colors) await upsertColors(input.colors);

    const data: Record<string, unknown> = {};
    if (input.name !== undefined) {
      data.name = input.name;
      if (input.name !== existing.name) data.slug = await uniqueSlug(input.name);
    }
    if (input.price !== undefined) data.price = input.price;
    if (input.description !== undefined) data.description = input.description;
    if (input.sku !== undefined) data.sku = input.sku ?? null;
    if (input.variant !== undefined) data.variantLabel = input.variant ?? null;
    if (input.badge !== undefined) data.badge = input.badge ?? null;
    if (input.status !== undefined) data.status = input.status ?? null;
    if (input.stock !== undefined) data.stock = input.stock ?? null;
    if (input.category !== undefined) {
      const category = await prisma.category.upsert({
        where: { name: input.category },
        create: { name: input.category },
        update: {},
      });
      data.categoryId = category.id;
    }
    if (Object.keys(data).length) await prisma.product.update({ where: { id }, data });

    if (input.variants) {
      await prisma.variant.deleteMany({ where: { productId: id } });
      await prisma.variant.createMany({
        data: variantCreate(input.variants).map((v) => ({ ...v, productId: id })),
      });
    }

    if (input.images) {
      // Destroy store assets for images that were removed.
      const keep = new Set(input.images.map((i) => i.publicId).filter(Boolean));
      for (const img of existing.images) {
        if (img.publicId && !keep.has(img.publicId)) {
          await imageStore.destroy(img.publicId).catch(() => undefined);
        }
      }
      await prisma.productImage.deleteMany({ where: { productId: id } });
      await prisma.productImage.createMany({
        data: imageCreate(input.images).map((img) => ({ ...img, productId: id })),
      });
    }

    await returnProduct(res, id);
  })
);

// GET /admin/products/:id — full editable product (variant matrix + raw images).
adminProductsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: productInclude,
    });
    if (!product) throw new HttpError(404, 'Product not found');
    res.json(toAdminProduct(product));
  })
);

// DELETE /admin/products/:id — delete one (and its images from the store).
adminProductsRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const ok = await deleteProductWithImages(req.params.id);
    if (!ok) throw new HttpError(404, 'Product not found');
    res.json({ ok: true });
  })
);
