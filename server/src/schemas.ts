import { z } from 'zod';

export const productListQuery = z.object({
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
