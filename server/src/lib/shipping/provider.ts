import { env } from '../../env';
import { ShippingStatus } from '../../contract';
import { ShiprocketProvider } from './shiprocket';
import { MockShippingProvider } from './mock';

// ============================================================================
// ShippingProvider — one interface, two adapters (mirrors PaymentGateway /
// ImageStore / EmailService). Shiprocket when credentialed, else a mock provider
// so the full two-way flow (create shipment + inbound tracking webhook) is
// code-complete and runs with no account. Activating the real provider is
// credentials-only, zero code change. Credentials are server-side only.
//
// This store is PREPAID ONLY (card/UPI) — there is no COD. An order ships only
// after paymentStatus = PAID (enforced by the ship route, not here).
// ============================================================================

// What the provider needs to create a shipment (built from an Order row).
export interface ShipmentOrderInput {
  orderId: string;
  customerName: string;
  email: string;
  phone?: string;
  items: { name: string; sku?: string; quantity: number; price: number }[];
  subtotal: number;
  total: number;
  shippingAddress: {
    name: string;
    line1: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
}

export interface CreateShipmentResult {
  shipmentId: string;
  awb: string;
  courier: string;
  labelUrl: string;
  trackingUrl: string;
}

export interface TrackingEvent {
  status: ShippingStatus;
  label: string;
  timestamp: string;
  location?: string;
}

export interface TrackingResult {
  status: ShippingStatus;
  events: TrackingEvent[];
}

export interface ShippingProvider {
  readonly mode: 'shiprocket' | 'mock';
  createShipment(order: ShipmentOrderInput): Promise<CreateShipmentResult>;
  getTracking(awb: string): Promise<TrackingResult>;
  cancelShipment(shipmentId: string): Promise<void>;
}

function createProvider(): ShippingProvider {
  const { email, password } = env.shiprocket;
  if (email && password) {
    // eslint-disable-next-line no-console
    console.log('[shipping] Shiprocket configured — using ShiprocketProvider.');
    return new ShiprocketProvider();
  }
  // eslint-disable-next-line no-console
  console.log('[shipping] Shiprocket not configured — shipments in mock mode.');
  return new MockShippingProvider();
}

export const shippingProvider = createProvider();
export { MockShippingProvider };
