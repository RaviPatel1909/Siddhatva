import crypto from 'node:crypto';
import { env } from '../../env';
import {
  CreateShipmentResult,
  ShipmentOrderInput,
  ShippingProvider,
  TrackingResult,
} from './provider';
import { mapShiprocketStatus } from './statusMap';

// Dev token used to verify mock tracking webhooks (mirrors the real x-api-key
// header Shiprocket sends). Exposed so the dev progression helper + tests can
// sign a payload the webhook route accepts.
export const MOCK_SHIPROCKET_WEBHOOK_TOKEN = 'mock-shiprocket-webhook-token';

// Deterministic fake identifiers derived from the order id, so the same order
// always yields the same AWB/shipment (idempotency is easy to reason about and
// tests are stable). No Date/random.
function digitsFrom(seed: string, len: number): string {
  const hex = crypto.createHash('sha256').update(seed).digest('hex');
  let out = '';
  for (const ch of hex) {
    out += (parseInt(ch, 16) % 10).toString();
    if (out.length === len) break;
  }
  return out;
}

// Dev fallback provider — returns deterministic shipment details and can build
// Shiprocket-shaped tracking webhook payloads so the inbound (two-way) path is
// fully exercisable with no account. Selected when Shiprocket isn't configured.
export class MockShippingProvider implements ShippingProvider {
  readonly mode = 'mock' as const;

  async createShipment(order: ShipmentOrderInput): Promise<CreateShipmentResult> {
    const awb = digitsFrom(`awb:${order.orderId}`, 12);
    const shipmentId = `ship_mock_${digitsFrom(`sid:${order.orderId}`, 10)}`;
    return {
      shipmentId,
      awb,
      courier: 'Delhivery Surface (mock)',
      labelUrl: `${env.publicUrl}/mock-shipping/label/${shipmentId}.pdf`,
      trackingUrl: `https://mock.shiprocket.local/tracking/${awb}`,
    };
  }

  async getTracking(awb: string): Promise<TrackingResult> {
    // The mock keeps no state — the DB (driven by the webhook) is the source of
    // truth. Return a minimal synthetic snapshot for the interface's sake.
    return {
      status: 'shipment_created',
      events: [
        {
          status: 'shipment_created',
          label: 'Shipment created (mock)',
          timestamp: '1970-01-01T00:00:00.000Z',
          location: 'Origin facility',
        },
      ],
    };
  }

  async cancelShipment(_shipmentId: string): Promise<void> {
    // no-op in mock mode
  }
}

// Build a Shiprocket-shaped tracking webhook body for a given AWB + status
// label, so dev tooling / tests can drive the real webhook handler through the
// full progression (in_transit → out_for_delivery → delivered). `timestamp` is
// injected by the caller (no Date here) so it stays deterministic.
export function buildMockShiprocketWebhook(
  awb: string,
  currentStatus: string,
  timestamp: string,
  orderId?: string
): string {
  return JSON.stringify({
    awb,
    current_status: currentStatus,
    order_id: orderId ?? '',
    current_timestamp: timestamp,
    scans: [{ date: timestamp, activity: currentStatus, location: 'Mock hub' }],
  });
}

// Convenience for the dev progression endpoint: pick a Shiprocket status label
// that maps to the requested normalized status.
export const MOCK_STATUS_LABEL: Record<string, string> = {
  in_transit: 'In Transit',
  out_for_delivery: 'Out For Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

// Assert the labels above map back to the intended normalized status (guards
// against drift between the mock and the real status map).
for (const [normalized, label] of Object.entries(MOCK_STATUS_LABEL)) {
  if (mapShiprocketStatus(label) !== normalized) {
    throw new Error(`Mock shipping label "${label}" does not map to ${normalized}`);
  }
}
