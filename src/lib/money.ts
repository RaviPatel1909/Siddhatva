// Single source of truth for money display (frontend). Renders INR with the ₹
// symbol and Indian digit grouping (e.g. ₹1,80,360). All price rendering across
// the app goes through formatPrice — no scattered currency formatting.
//
// Whole rupees only: catalog prices and order totals are whole-rupee integers
// (checkout rounds tax so totals stay integer), so no paise are shown and the
// displayed amount equals the Razorpay charge (total × 100 paise) exactly.
//
// Mirror of server/src/lib/money.ts (used by the transactional email templates,
// which can't import from the frontend package). Keep the two in sync.
const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

export function formatPrice(amount: number): string {
  return inr.format(Math.round(amount));
}
