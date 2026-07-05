import { Prisma } from '@prisma/client';
import {
  ApiOrder,
  ApiProduct,
  CategoryFacet,
  Color,
  ColorFacet,
  OrderStatus,
  ProductBadge,
  ProductStatus,
} from '../contract';

// Relations needed to build the contract shapes. Ordered so distinct colours
// and sizes come out in the authored (frontend) order.
export const productInclude = {
  images: { orderBy: { position: 'asc' } },
  variants: { orderBy: { position: 'asc' }, include: { color: true } },
  category: true,
} satisfies Prisma.ProductInclude;

export type ProductWithRelations = Prisma.ProductGetPayload<{ include: typeof productInclude }>;

export const orderInclude = {
  items: { orderBy: { position: 'asc' } },
  shippingAddress: true,
} satisfies Prisma.OrderInclude;

export type OrderWithRelations = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

export function toApiProduct(p: ProductWithRelations): ApiProduct {
  const colorMap = new Map<string, Color>();
  const sizes: string[] = [];
  for (const v of p.variants) {
    if (!colorMap.has(v.color.id)) {
      colorMap.set(v.color.id, { id: v.color.id, name: v.color.name, hex: v.color.hex });
    }
    if (!sizes.includes(v.size)) sizes.push(v.size);
  }
  // Key order matches the MSW reference exactly (it spreads the source product
  // then appends slug), so responses are byte-identical. Optional fields are
  // undefined when absent → JSON.stringify omits them, matching MSW.
  return {
    id: p.id,
    name: p.name,
    price: p.price,
    description: p.description,
    category: p.category.name,
    variant: p.variantLabel ?? undefined,
    badge: (p.badge as ProductBadge | null) ?? undefined,
    stock: p.stock ?? undefined,
    sku: p.sku ?? undefined,
    status: (p.status as ProductStatus | null) ?? undefined,
    colors: Array.from(colorMap.values()),
    sizes,
    images: p.images.map((img) => ({ id: img.imageId, src: img.src, alt: img.alt })),
    slug: p.slug,
  };
}

export function toApiOrder(o: OrderWithRelations): ApiOrder {
  return {
    id: o.id,
    customerName: o.customerName,
    date: o.date,
    status: o.status as OrderStatus,
    items: o.items.map((it) => ({
      productId: it.productId,
      name: it.name,
      image: it.image,
      variant: it.variant,
      quantity: it.quantity,
      price: it.price,
    })),
    subtotal: o.subtotal,
    shipping: o.shipping,
    tax: o.tax,
    total: o.total,
    shippingAddress: {
      name: o.shippingAddress.name,
      line1: o.shippingAddress.line1,
      city: o.shippingAddress.city,
      state: o.shippingAddress.state,
      zip: o.shippingAddress.zip,
      country: o.shippingAddress.country,
    },
  };
}

// Facets computed over the whole catalog (filter-independent), first-seen order.
export function computeFacets(all: ProductWithRelations[]): {
  categories: CategoryFacet[];
  colors: ColorFacet[];
} {
  const catCounts = new Map<string, number>();
  for (const p of all) catCounts.set(p.category.name, (catCounts.get(p.category.name) ?? 0) + 1);
  const categories: CategoryFacet[] = Array.from(catCounts.entries()).map(([name, count]) => ({
    name,
    count,
  }));

  const colorMap = new Map<string, ColorFacet>();
  for (const p of all) {
    for (const v of p.variants) {
      if (!colorMap.has(v.color.id)) {
        colorMap.set(v.color.id, { id: v.color.id, name: v.color.name, hex: v.color.hex });
      }
    }
  }
  return { categories, colors: Array.from(colorMap.values()) };
}
