// Plain data shapes the email templates render from. Kept free of Prisma types
// so templates can be previewed/tested with fixtures and the render layer maps
// DB rows → these shapes once (see lib/email/subscribers.ts).

export interface EmailOrderItem {
  name: string;
  variant: string;
  quantity: number;
  price: number; // per-unit, in store currency (INR, whole rupees)
}

export interface EmailAddress {
  name: string;
  line1: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export interface OrderEmailData {
  orderId: string;
  customerName: string;
  items: EmailOrderItem[];
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  shippingAddress: EmailAddress;
  orderUrl: string; // deep link to the customer's order in the app
}

export interface PasswordResetEmailData {
  name: string;
  resetUrl: string;
  expiresInMinutes: number;
}
