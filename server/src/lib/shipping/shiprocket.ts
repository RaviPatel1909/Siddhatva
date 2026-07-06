import { env } from '../../env';
import {
  CreateShipmentResult,
  ShipmentOrderInput,
  ShippingProvider,
  TrackingEvent,
  TrackingResult,
} from './provider';
import { mapShiprocketStatus } from './statusMap';

const BASE = 'https://apiv2.shiprocket.in/v1/external';

// Real adapter — Shiprocket REST via fetch (no SDK, matching RazorpayGateway).
// Token auth: the login token EXPIRES, so it's cached and only refreshed on a
// 401 (never fetched per request). Flow: create order → assign courier/AWB →
// generate label → return AWB + label + tracking URL.
export class ShiprocketProvider implements ShippingProvider {
  readonly mode = 'shiprocket' as const;
  private token: string | null = null;

  private async login(): Promise<string> {
    const res = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: env.shiprocket.email, password: env.shiprocket.password }),
    });
    if (!res.ok) throw new Error(`Shiprocket auth failed: ${res.status} ${await res.text()}`);
    const data = (await res.json()) as { token?: string };
    if (!data.token) throw new Error('Shiprocket auth returned no token');
    this.token = data.token;
    return data.token;
  }

  // Authenticated request with cached token; on 401 refresh the token ONCE and
  // retry (tokens expire — we don't log in per call).
  private async request<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
    const token = this.token ?? (await this.login());
    const res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(init.headers ?? {}),
      },
    });
    if (res.status === 401 && retry) {
      this.token = null;
      return this.request<T>(path, init, false);
    }
    if (!res.ok) throw new Error(`Shiprocket ${path} failed: ${res.status} ${await res.text()}`);
    return (await res.json()) as T;
  }

  async createShipment(order: ShipmentOrderInput): Promise<CreateShipmentResult> {
    const [firstName, ...rest] = order.shippingAddress.name.split(' ');
    const created = await this.request<{ order_id: number; shipment_id: number }>(
      '/orders/create/adhoc',
      {
        method: 'POST',
        body: JSON.stringify({
          order_id: order.orderId,
          order_date: new Date().toISOString().slice(0, 10),
          pickup_location: env.shiprocket.pickupLocation,
          channel_id: env.shiprocket.channelId || undefined,
          billing_customer_name: firstName,
          billing_last_name: rest.join(' '),
          billing_address: order.shippingAddress.line1,
          billing_city: order.shippingAddress.city,
          billing_pincode: order.shippingAddress.zip,
          billing_state: order.shippingAddress.state,
          billing_country: order.shippingAddress.country,
          billing_email: order.email,
          billing_phone: order.phone ?? '',
          shipping_is_billing: true,
          order_items: order.items.map((it) => ({
            name: it.name,
            sku: it.sku ?? it.name,
            units: it.quantity,
            selling_price: it.price,
          })),
          payment_method: 'Prepaid', // prepaid only — never COD
          sub_total: order.subtotal,
          // Declare package dims/weight — weight disputes are the common billing
          // issue (see SHIPROCKET.md). These defaults should be tuned per catalog.
          length: 20,
          breadth: 20,
          height: 8,
          weight: 0.5,
        }),
      }
    );

    // Assign a courier + generate the AWB for the shipment.
    const awbRes = await this.request<{
      response?: { data?: { awb_code?: string; courier_name?: string } };
    }>('/courier/assign/awb', {
      method: 'POST',
      body: JSON.stringify({ shipment_id: created.shipment_id }),
    });
    const awb = awbRes.response?.data?.awb_code ?? '';
    const courier = awbRes.response?.data?.courier_name ?? 'Shiprocket';

    // Generate the shipping label (PDF).
    const label = await this.request<{ label_url?: string }>('/courier/generate/label', {
      method: 'POST',
      body: JSON.stringify({ shipment_id: [created.shipment_id] }),
    });

    return {
      shipmentId: String(created.shipment_id),
      awb,
      courier,
      labelUrl: label.label_url ?? '',
      trackingUrl: awb ? `https://shiprocket.co/tracking/${awb}` : '',
    };
  }

  async getTracking(awb: string): Promise<TrackingResult> {
    const data = await this.request<{
      tracking_data?: {
        shipment_track?: { current_status?: string }[];
        shipment_track_activities?: { status?: string; date?: string; activity?: string; location?: string }[];
      };
    }>(`/courier/track/awb/${awb}`, { method: 'GET' });

    const current = data.tracking_data?.shipment_track?.[0]?.current_status ?? '';
    const status = mapShiprocketStatus(current) ?? 'shipment_created';
    const events: TrackingEvent[] = (data.tracking_data?.shipment_track_activities ?? []).map((a) => ({
      status: mapShiprocketStatus(a.status ?? a.activity ?? '') ?? status,
      label: a.activity ?? a.status ?? '',
      timestamp: a.date ?? '',
      location: a.location,
    }));
    return { status, events };
  }

  async cancelShipment(shipmentId: string): Promise<void> {
    await this.request('/orders/cancel/shipment/awbs', {
      method: 'POST',
      body: JSON.stringify({ awbs: [shipmentId] }),
    });
  }
}
