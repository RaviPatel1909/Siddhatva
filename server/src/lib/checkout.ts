import crypto from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../prisma';
import { HttpError } from './http';
import { imageStore } from './imageStore';
import { computeOrderPricing, OrderPricing } from './pricing';
import type { CreateOrderBody } from '../schemas';

// ============================================================================
// Checkout order builder — turns an untrusted client request into a fully
// server-computed, validated order draft ready to persist.
//
// This is the security boundary for C1 (client price/total tampering): NOTHING
// monetary is read from the request here. Prices come from the DB, totals from
// lib/pricing.ts. Validation (existence / sellability / variant / stock) and
// duplicate-merging happen before any money is computed.
// ============================================================================

const MAX_ORDER_ID_ATTEMPTS = 5;

// Product statuses that cannot be purchased. A null/undefined status or "active"
// is sellable; a draft or explicitly out-of-stock product is not.
const UNSELLABLE_STATUSES = new Set(['draft', 'out-of-stock']);

// Only the columns/relations checkout needs: variants (for price-bearing stock)
// and the primary image (for the item snapshot).
const checkoutProductInclude = {
  variants: { include: { color: true } },
  images: { orderBy: { position: 'asc' }, take: 1 },
} satisfies Prisma.ProductInclude;

type CheckoutProduct = Prisma.ProductGetPayload<{ include: typeof checkoutProductInclude }>;
type CheckoutVariant = CheckoutProduct['variants'][number];
type RequestedItem = CreateOrderBody['items'][number];

// A validated, priced line ready to persist. Every value is server-derived.
export interface OrderItemDraft {
  productId: string;
  name: string;
  image: string;
  variant: string;
  quantity: number;
  price: number; // the unit price actually charged (DB price at purchase time)
  position: number;
}

export interface OrderDraft {
  id: string;
  date: string; // "YYYY-MM-DD"
  items: OrderItemDraft[];
  pricing: OrderPricing;
}

// Resolve the requested variant on a product. Prefers the structured identity
// (colorId + size); falls back to the legacy display label ("Champagne / M") so
// older clients still resolve a real variant. Returns null when nothing matches.
function resolveVariant(product: CheckoutProduct, item: RequestedItem): CheckoutVariant | null {
  if (item.colorId && item.size) {
    return (
      product.variants.find((v) => v.colorId === item.colorId && v.size === item.size) ?? null
    );
  }
  if (item.variant) {
    const [colorName, size] = item.variant.split(' / ');
    return product.variants.find((v) => v.color.name === colorName && v.size === size) ?? null;
  }
  return null;
}

// A resolved+validated line, keyed so duplicates merge before the stock check.
interface ResolvedLine {
  product: CheckoutProduct;
  variant: CheckoutVariant | null;
  variantLabel: string;
  quantity: number;
}

// Build a server-authoritative order draft from an untrusted create-order body.
// Throws HttpError(422) when the order cannot be fulfilled (unknown/inactive
// product, unavailable variant, insufficient stock). Never reads client money.
export async function buildOrderDraft(input: CreateOrderBody): Promise<OrderDraft> {
  const productIds = [...new Set(input.items.map((i) => i.productId))];
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    include: checkoutProductInclude,
  });
  const byId = new Map(products.map((p) => [p.id, p]));

  // Pass 1 — resolve + validate each requested line, merging duplicates (same
  // product + variant) by summing quantity. Merging BEFORE the stock check means
  // splitting one variant across several lines can't bypass the available stock.
  const merged = new Map<string, ResolvedLine>();
  for (const item of input.items) {
    const product = byId.get(item.productId);
    if (!product) {
      throw new HttpError(422, `A product in your bag is no longer available.`);
    }
    if (product.status && UNSELLABLE_STATUSES.has(product.status)) {
      throw new HttpError(422, `"${product.name}" is not available for purchase.`);
    }

    const variant = resolveVariant(product, item);
    if (product.variants.length > 0 && !variant) {
      throw new HttpError(422, `The selected option for "${product.name}" is unavailable.`);
    }

    const key = variant ? `v:${variant.id}` : `p:${product.id}`;
    const variantLabel = variant ? `${variant.color.name} / ${variant.size}` : item.variant ?? '';
    const existing = merged.get(key);
    if (existing) {
      existing.quantity += item.quantity;
    } else {
      merged.set(key, { product, variant, variantLabel, quantity: item.quantity });
    }
  }

  // Pass 2 — stock-check merged quantities and snapshot the priced item. Variant
  // stock is authoritative when the product has variants; otherwise fall back to
  // the product-level stock.
  const items: OrderItemDraft[] = [];
  let position = 0;
  for (const line of merged.values()) {
    const available = line.variant ? line.variant.stock : line.product.stock ?? 0;
    if (available <= 0) {
      throw new HttpError(422, `"${line.product.name}" is out of stock.`);
    }
    if (line.quantity > available) {
      throw new HttpError(
        422,
        `Only ${available} of "${line.product.name}" ${line.variantLabel ? `(${line.variantLabel}) ` : ''}left in stock.`
      );
    }
    const primaryImage = line.product.images[0];
    items.push({
      productId: line.product.id,
      name: line.product.name,
      image: primaryImage ? imageStore.toDeliveryUrl(primaryImage.src) : '',
      variant: line.variantLabel,
      quantity: line.quantity,
      price: line.product.price, // server truth — the DB price, never the client's
      position: position++,
    });
  }

  const pricing = computeOrderPricing(
    items.map((it) => ({ unitPrice: it.price, quantity: it.quantity }))
  );

  return {
    id: await generateOrderId(),
    date: new Date().toISOString().slice(0, 10),
    items,
    pricing,
  };
}

// Server-generated order id in the existing "SID-#####" style. Generated here (not
// taken from the client) so ids aren't attacker-chosen and can't collide with an
// existing order; retries on the astronomically-unlikely collision.
async function generateOrderId(): Promise<string> {
  for (let attempt = 0; attempt < MAX_ORDER_ID_ATTEMPTS; attempt++) {
    const id = `SID-${crypto.randomInt(10000, 100000)}`;
    const existing = await prisma.order.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return id;
  }
  return `SID-${crypto.randomInt(100000, 1000000)}`;
}
