import { Prisma } from '@prisma/client';
import {
  AdminCustomerListItem,
  AdminSearchResults,
  ApiOrder,
  ApiProduct,
  CategoryFacet,
  Color,
  ColorFacet,
  OrderStatus,
  PaymentStatus,
  PriceFacet,
  ProductBadge,
  ProductStatus,
  ShippingStatus,
  SizeFacet,
} from '../contract';
import { imageStore } from './imageStore';

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
    // Deliver optimized URLs (Cloudinary f_auto/q_auto); seed/local URLs pass through.
    images: p.images.map((img) => ({
      id: img.imageId,
      src: imageStore.toDeliveryUrl(img.src),
      alt: img.alt,
    })),
    slug: p.slug,
  };
}

// Full editable product for the admin editor: includes the per-combination
// variant stock matrix and raw image url+publicId (not delivery-transformed).
export function toAdminProduct(p: ProductWithRelations) {
  const colorMap = new Map<string, Color>();
  const sizes: string[] = [];
  for (const v of p.variants) {
    if (!colorMap.has(v.color.id)) {
      colorMap.set(v.color.id, { id: v.color.id, name: v.color.name, hex: v.color.hex });
    }
    if (!sizes.includes(v.size)) sizes.push(v.size);
  }
  return {
    id: p.id,
    name: p.name,
    price: p.price,
    description: p.description,
    category: p.category.name,
    variant: p.variantLabel ?? undefined,
    sku: p.sku ?? undefined,
    badge: (p.badge as ProductBadge | null) ?? undefined,
    status: (p.status as ProductStatus | null) ?? undefined,
    stock: p.stock ?? undefined,
    colors: Array.from(colorMap.values()),
    sizes,
    variants: p.variants.map((v) => ({ colorId: v.colorId, size: v.size, stock: v.stock })),
    images: p.images.map((img) => ({ url: img.src, publicId: img.publicId, alt: img.alt })),
  };
}

export function toApiOrder(o: OrderWithRelations): ApiOrder {
  return {
    id: o.id,
    userId: o.userId,
    customerName: o.customerName,
    date: o.date,
    status: o.status as OrderStatus,
    paymentStatus: o.paymentStatus as PaymentStatus,
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
    shippingStatus: o.shippingStatus as ShippingStatus,
    awb: o.awb ?? undefined,
    courier: o.courier ?? undefined,
    trackingUrl: o.trackingUrl ?? undefined,
    labelUrl: o.labelUrl ?? undefined,
  };
}

// --- Admin search DTOs ---
// Minimal per-group selects: only the columns each dropdown row needs (+ the id
// to navigate). Category is a relation, so its name is pulled via a nested select.
export const adminSearchProductSelect = {
  id: true,
  name: true,
  category: { select: { name: true } },
} satisfies Prisma.ProductSelect;

export const adminSearchOrderSelect = {
  id: true,
  customerName: true,
  status: true,
} satisfies Prisma.OrderSelect;

export const adminSearchCustomerSelect = {
  id: true,
  name: true,
  email: true,
} satisfies Prisma.UserSelect;

type SearchProduct = Prisma.ProductGetPayload<{ select: typeof adminSearchProductSelect }>;
type SearchOrder = Prisma.OrderGetPayload<{ select: typeof adminSearchOrderSelect }>;
type SearchCustomer = Prisma.UserGetPayload<{ select: typeof adminSearchCustomerSelect }>;

export function toAdminSearchProduct(p: SearchProduct): AdminSearchResults['products'][number] {
  return { id: p.id, name: p.name, sublabel: p.category.name };
}

export function toAdminSearchOrder(o: SearchOrder): AdminSearchResults['orders'][number] {
  return { id: o.id, label: o.id, sublabel: `${o.customerName} · ${o.status}` };
}

export function toAdminSearchCustomer(u: SearchCustomer): AdminSearchResults['customers'][number] {
  return { id: u.id, name: u.name, email: u.email };
}

// --- Admin customer DTOs ---
// Only the identity columns; the order aggregates are computed by the route (via
// groupBy, to avoid N+1) and passed in — the mapper just assembles the row.
export const adminCustomerSelect = {
  id: true,
  name: true,
  email: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

type AdminCustomerRow = Prisma.UserGetPayload<{ select: typeof adminCustomerSelect }>;

export function toAdminCustomerListItem(
  u: AdminCustomerRow,
  orderCount: number,
  totalSpent: number
): AdminCustomerListItem {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    createdAt: u.createdAt.toISOString(),
    orderCount,
    totalSpent,
  };
}

// Facets, in first-seen order. Two different scopes on purpose
// (docs/API_CONTRACT.md):
//
//   categories — NAVIGATION: always the whole catalog (`all`), so no category can
//     disappear because a refinement emptied it, and the storefront's "All (n)"
//     stays the true catalog total.
//   colors/sizes/price — REFINEMENTS: the caller passes, per facet, the products
//     matching every active filter EXCEPT that facet's own. That is what makes the
//     colour list on /shop/Men show only the colours Men actually comes in, while
//     picking a colour still leaves the other colours selectable rather than
//     stranding the shopper with a single option and no way back.
export function computeFacets(
  all: ProductWithRelations[],
  context: {
    forColors: ProductWithRelations[];
    forSizes: ProductWithRelations[];
    forPrice: ProductWithRelations[];
  }
): {
  categories: CategoryFacet[];
  colors: ColorFacet[];
  sizes: SizeFacet[];
  price: PriceFacet;
} {
  const catCounts = new Map<string, number>();
  for (const p of all) catCounts.set(p.category.name, (catCounts.get(p.category.name) ?? 0) + 1);
  const categories: CategoryFacet[] = Array.from(catCounts.entries()).map(([name, count]) => ({
    name,
    count,
  }));

  // Count products (not variants) per colour — a product offering a colour in
  // four sizes is one match, so the count means "pieces you'd see".
  const colorMap = new Map<string, ColorFacet>();
  for (const p of context.forColors) {
    const seen = new Set<string>();
    for (const v of p.variants) {
      if (seen.has(v.color.id)) continue;
      seen.add(v.color.id);
      const hit = colorMap.get(v.color.id);
      if (hit) hit.count += 1;
      else
        colorMap.set(v.color.id, {
          id: v.color.id,
          name: v.color.name,
          hex: v.color.hex,
          count: 1,
        });
    }
  }

  const sizeCounts = new Map<string, number>();
  for (const p of context.forSizes) {
    const seen = new Set<string>();
    for (const v of p.variants) {
      if (seen.has(v.size)) continue;
      seen.add(v.size);
      sizeCounts.set(v.size, (sizeCounts.get(v.size) ?? 0) + 1);
    }
  }

  const prices = context.forPrice.map((p) => p.price);

  return {
    categories,
    colors: Array.from(colorMap.values()),
    sizes: Array.from(sizeCounts.entries()).map(([value, count]) => ({ value, count })),
    price: {
      min: prices.length ? Math.min(...prices) : 0,
      max: prices.length ? Math.max(...prices) : 0,
    },
  };
}
