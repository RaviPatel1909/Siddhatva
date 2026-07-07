// Money display for the server (transactional email templates). Renders INR with
// the ₹ symbol and Indian digit grouping (e.g. ₹1,80,360), whole rupees only.
// Mirror of the frontend src/lib/money.ts — keep the two in sync. (The email
// templates run in the server package and can't import from the frontend.)
const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

export function formatPrice(amount: number): string {
  return inr.format(Math.round(amount));
}
