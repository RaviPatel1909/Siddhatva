import { z } from 'zod';

export const productListQuery = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  color: z.string().optional(),
  size: z.string().optional(),
  sort: z.enum(['featured', 'price-asc', 'price-desc']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).optional(),
});

const addressSchema = z.object({
  name: z.string().min(1),
  line1: z.string().min(1),
  city: z.string().min(1),
  state: z.string(),
  zip: z.string().min(1),
  country: z.string().min(1),
});

const orderItemSchema = z.object({
  productId: z.string().min(1),
  name: z.string().min(1),
  image: z.string(),
  variant: z.string(),
  quantity: z.number().int().min(1),
  price: z.number(),
});

// The client builds the order (id/date) and posts it; server accepts them or
// fills defaults. Status is always assigned server-side ("processing").
export const createOrderBody = z.object({
  id: z.string().optional(),
  date: z.string().optional(),
  customerName: z.string().min(1),
  items: z.array(orderItemSchema).min(1),
  subtotal: z.number(),
  shipping: z.number(),
  tax: z.number(),
  total: z.number(),
  shippingAddress: addressSchema,
});
export type CreateOrderBody = z.infer<typeof createOrderBody>;

export const wishlistBody = z.object({
  productId: z.string().min(1),
});

// --- Auth ---
export const registerBody = z.object({
  email: z.string().email('Enter a valid email'),
  name: z.string().min(1, 'Required'),
  password: z.string().min(8, 'At least 8 characters'),
});

export const loginBody = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Required'),
});

// Password reset. `newPassword` reuses the register policy (min 8) so the reset
// path can't set a weaker password than signup allows.
export const forgotPasswordBody = z.object({
  email: z.string().email('Enter a valid email'),
});
export const resetPasswordBody = z.object({
  token: z.string().min(1, 'Missing token'),
  newPassword: z.string().min(8, 'At least 8 characters'),
});

// --- Admin product CRUD ---
const productBadge = z.enum(['new', 'limited', 'sold-out']);
const productStatus = z.enum(['active', 'draft', 'out-of-stock']);

const colorInput = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  hex: z.string().min(1),
});
const variantInput = z.object({
  colorId: z.string().min(1),
  size: z.string().min(1),
  stock: z.number().int().min(0),
});
// Images arrive already uploaded (Cloudinary/local); [0] is the primary.
const imageInput = z.object({
  url: z.string().min(1),
  publicId: z.string().nullable().optional(),
  alt: z.string().optional(),
});

export const createProductBody = z.object({
  name: z.string().min(1),
  price: z.number().int().min(0),
  description: z.string().default(''),
  category: z.string().min(1),
  variant: z.string().optional(),
  sku: z.string().optional(),
  badge: productBadge.nullable().optional(),
  status: productStatus.nullable().optional(),
  stock: z.number().int().min(0).optional(),
  colors: z.array(colorInput).min(1),
  sizes: z.array(z.string().min(1)).min(1),
  variants: z.array(variantInput),
  images: z.array(imageInput),
});
export const updateProductBody = createProductBody.partial();

export const bulkIdsBody = z.object({ ids: z.array(z.string().min(1)).min(1) });
export const bulkStatusBody = z.object({
  ids: z.array(z.string().min(1)).min(1),
  status: productStatus,
});

// --- Admin order status ---
export const orderStatusBody = z.object({
  status: z.enum(['processing', 'shipped', 'delivered', 'cancelled']),
});

// --- Admin analytics (/admin/analytics/*) ---
// A `YYYY-MM-DD` calendar date, validated strictly (rejects 2026-13-01 /
// 2026-02-30 which a regex alone would pass). Interpreted as an IST day downstream.
function isValidCalendarDate(s: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}
const isoDate = z
  .string()
  .refine(isValidCalendarDate, 'Expected a valid date as YYYY-MM-DD');

// `from` must be on/before `to` when both are present; invalid input is rejected
// (400), never coerced.
const fromBeforeTo = (v: { from?: string; to?: string }) => !v.from || !v.to || v.from <= v.to;
const fromBeforeToOpts = { message: '`from` must be on or before `to`', path: ['from'] };
const rangeShape = { from: isoDate.optional(), to: isoDate.optional() };
export const granularity = z.enum(['day', 'week', 'month']);

export const analyticsRangeQuery = z.object(rangeShape).refine(fromBeforeTo, fromBeforeToOpts);
export const analyticsTimeSeriesQuery = z
  .object({ ...rangeShape, granularity: granularity.optional() })
  .refine(fromBeforeTo, fromBeforeToOpts);
export const analyticsProductsQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

// --- Payments ---
export const paymentVerifyBody = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});

// --- Site content (home) — full-replace of the fixed slots ---
export const homeContentSchema = z.object({
  hero: z.object({
    image: z.string(),
    headline: z.string().min(1),
    subheadline: z.string(),
    primaryCtaLabel: z.string(),
    primaryCtaHref: z.string(),
    secondaryCtaLabel: z.string(),
    secondaryCtaHref: z.string(),
  }),
  philosophy: z.object({
    image: z.string(),
    heading: z.string().min(1),
    body: z.string(),
  }),
  collectionCards: z
    .array(z.object({ image: z.string(), label: z.string(), href: z.string() }))
    .length(3),
  newsletter: z.object({
    heading: z.string().min(1),
    subtext: z.string(),
  }),
});
