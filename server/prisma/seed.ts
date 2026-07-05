import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
// Seed from the frontend's mock data so the DB starts with the exact catalog
// (ids, names, colours, sizes, prices, stock) the MSW handlers served.
import { products } from '../../src/data/products';
import { orders as seedOrders } from '../../src/data/orders';
import { slugify } from '../src/lib/slug';

const prisma = new PrismaClient();

type SeedProduct = (typeof products)[number];

function buildVariants(p: SeedProduct) {
  // Colour × size combinations (colour-major so distinct colours/sizes come out
  // in authored order). Stock is distributed across combos; the contract's
  // product-level `stock` is stored separately on Product.
  const combos = p.colors.length * p.sizes.length;
  const perCombo = p.stock != null && combos > 0 ? Math.floor(p.stock / combos) : 0;
  const variants: { colorId: string; size: string; stock: number; position: number }[] = [];
  let position = 0;
  for (const color of p.colors) {
    for (const size of p.sizes) {
      variants.push({ colorId: color.id, size, stock: perCombo, position: position++ });
    }
  }
  return variants;
}

async function main() {
  // Reset (respecting FK order).
  await prisma.review.deleteMany();
  await prisma.wishlistItem.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.address.deleteMany();
  await prisma.variant.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.product.deleteMany();
  await prisma.color.deleteMany();
  await prisma.collection.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  // Demo customer (the signed-in user until auth exists).
  const user = await prisma.user.create({
    data: { email: 'alexander@siddhatva.com', name: 'Alexander Sterling' },
  });

  // Categories in first-seen order.
  const categoryByName = new Map<string, string>();
  for (const name of Array.from(new Set(products.map((p) => p.category)))) {
    const c = await prisma.category.create({ data: { name } });
    categoryByName.set(name, c.id);
  }

  const collection = await prisma.collection.create({
    data: { name: 'Luxe Minimalist', slug: 'luxe-minimalist' },
  });

  // Colours (unique across the catalog).
  const colorSeen = new Map<string, { id: string; name: string; hex: string }>();
  products.forEach((p) => p.colors.forEach((c) => colorSeen.has(c.id) || colorSeen.set(c.id, c)));
  for (const c of colorSeen.values()) {
    await prisma.color.create({ data: { id: c.id, name: c.name, hex: c.hex } });
  }

  // Products + images + variants.
  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    await prisma.product.create({
      data: {
        id: p.id,
        position: i,
        slug: slugify(p.name),
        name: p.name,
        price: p.price,
        description: p.description,
        sku: p.sku ?? null,
        variantLabel: p.variant ?? null,
        badge: p.badge ?? null,
        status: p.status ?? null,
        stock: p.stock ?? null,
        categoryId: categoryByName.get(p.category)!,
        collectionId: collection.id,
        images: {
          create: p.images.map((img, idx) => ({
            imageId: img.id,
            src: img.src,
            alt: img.alt,
            position: idx,
          })),
        },
        variants: { create: buildVariants(p) },
      },
    });
  }

  // Seed order history. createdAt is spaced so the array order (earlier index =
  // more recent) surfaces newest-first on GET /orders.
  const base = new Date('2023-11-01T00:00:00Z').getTime();
  for (let i = 0; i < seedOrders.length; i++) {
    const o = seedOrders[i];
    await prisma.order.create({
      data: {
        id: o.id,
        user: { connect: { id: user.id } },
        customerName: o.customerName,
        date: o.date,
        status: o.status,
        subtotal: o.subtotal,
        shipping: o.shipping,
        tax: o.tax,
        total: o.total,
        createdAt: new Date(base - i * 60_000),
        shippingAddress: { create: { ...o.shippingAddress } },
        items: { create: o.items.map((it, idx) => ({ ...it, position: idx })) },
      },
    });
  }

  // Seed the demo customer's wishlist (matches the frontend WishlistContext seed
  // and the MSW /wishlist fallback: products 7, 8, 9, in order).
  for (const productId of ['7', '8', '9']) {
    await prisma.wishlistItem.create({ data: { userId: user.id, productId } });
  }

  // eslint-disable-next-line no-console
  console.log(
    `Seed complete — ${products.length} products, ${seedOrders.length} orders, 3 wishlist items.`
  );
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
