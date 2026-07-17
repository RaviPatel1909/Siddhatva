// Client mirror of the server's order-pricing rules (server/src/lib/pricing.ts),
// same pattern as money.ts. Used for the checkout summary the shopper sees and by
// the MSW mock so mock ↔ real stay in lockstep. The SERVER is authoritative for
// what is actually charged — this only keeps the displayed figures identical.
// If a rule changes on the server, change it here too.

export const FREE_SHIPPING_THRESHOLD = 500;
export const FLAT_SHIPPING = 15;
export const TAX_RATE = 0.08; // 8%

export function shippingFor(subtotal: number): number {
  return subtotal === 0 || subtotal > FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING;
}

// Rounded so money stays whole-rupee → the displayed ₹ total equals the charge.
export function taxFor(subtotal: number): number {
  return Math.round(subtotal * TAX_RATE);
}

export interface OrderTotals {
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
}

// Totals for a given subtotal (discount reserved for a future coupon system).
export function totalsFor(subtotal: number): OrderTotals {
  const shipping = shippingFor(subtotal);
  const tax = taxFor(subtotal);
  return { subtotal, shipping, tax, total: subtotal + shipping + tax };
}
