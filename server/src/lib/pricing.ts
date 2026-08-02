// Single source of truth for order money on the server. PURE — no DB access, no
// client input, no side effects. Every value an order is charged flows through
// here, computed only from server-trusted unit prices + quantities.
//
// Mirrored on the client in `src/lib/pricing.ts` (same pattern as money.ts) so
// the checkout summary a shopper sees matches exactly what the server charges.
// If you change a rule here, change it there too.

// Shipping is complimentary above this subtotal (whole INR rupees); at or below
// it (but non-zero) a flat rate applies. An empty cart ships free by definition.
export const FREE_SHIPPING_THRESHOLD = 2500;
export const FLAT_SHIPPING = 15;
export const TAX_RATE = 0.08; // 8%

export interface PricedLine {
  unitPrice: number; // whole INR rupees, taken from the database — never the client
  quantity: number; // validated positive integer
}

export interface OrderPricing {
  subtotal: number;
  shipping: number;
  tax: number;
  discount: number;
  total: number;
}

export function shippingFor(subtotal: number): number {
  return subtotal === 0 || subtotal > FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING;
}

// Rounded so order money stays whole-rupee integers → the displayed ₹ total
// equals the Razorpay charge (total × 100 paise) exactly. See src/lib/money.ts.
export function taxFor(subtotal: number): number {
  return Math.round(subtotal * TAX_RATE);
}

// Compute every monetary value of an order from server-trusted lines.
//
// `discount` is the coupon extension point: it is 0 today (no coupon system), and
// when coupons land the caller must pass a **server-validated, server-computed**
// discount here — never a value taken from the request body.
export function computeOrderPricing(lines: PricedLine[], discount = 0): OrderPricing {
  const subtotal = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
  const shipping = shippingFor(subtotal);
  const tax = taxFor(subtotal);
  const total = subtotal + shipping + tax - discount;
  return { subtotal, shipping, tax, discount, total };
}
