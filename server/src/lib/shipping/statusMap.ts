import { ShippingStatus } from '../../contract';

// Map a Shiprocket tracking status string → our normalized ShippingStatus.
// Shiprocket sends free-form-ish status labels (and codes); we match on the
// label case-insensitively. Returns null for statuses we don't act on, so the
// webhook can 200 without changing state (never guess a wrong transition).
export function mapShiprocketStatus(raw: string): ShippingStatus | null {
  const s = raw.trim().toLowerCase();
  if (!s) return null;

  // Returns (RTO) — treat as cancelled from the customer's forward-journey view.
  if (s.includes('rto') || s.includes('return')) return 'cancelled';
  if (s.includes('cancel')) return 'cancelled';

  if (s.includes('delivered')) return 'delivered';
  if (s.includes('out for delivery') || s.includes('out-for-delivery')) return 'out_for_delivery';
  if (s.includes('in transit') || s.includes('in-transit') || s === 'shipped') return 'in_transit';

  if (
    s.includes('pickup') ||
    s.includes('awb assigned') ||
    s.includes('label') ||
    s.includes('manifest') ||
    s.includes('pickup generated')
  ) {
    return 'shipment_created';
  }
  return null;
}

// Ordered forward journey — used to build a customer timeline and to guard
// against regressions (never move a shipment backwards on a stray event).
export const SHIPPING_PROGRESSION: ShippingStatus[] = [
  'not_shipped',
  'shipment_created',
  'in_transit',
  'out_for_delivery',
  'delivered',
];

export function shippingRank(status: ShippingStatus): number {
  const i = SHIPPING_PROGRESSION.indexOf(status);
  return i === -1 ? -1 : i; // cancelled → -1 (off the forward path)
}
