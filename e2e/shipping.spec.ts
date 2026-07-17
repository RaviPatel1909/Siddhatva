import { test, expect, request, APIRequestContext } from '@playwright/test';
import { ADMIN, CUSTOMER } from './testCredentials';

// Shipping (Shiprocket) exercised at the mock-provider boundary: admin creates a
// shipment on a PAID order, and the tracking webhook (the source of truth) drives
// shippingStatus through to delivered. Same handler path as real Shiprocket.
//
// Prerequisite: seeded database in mock mode (no SHIPROCKET_* set).

const API = 'http://localhost:4000/api';
const MOCK_WEBHOOK_TOKEN = 'mock-shiprocket-webhook-token';

const authHeaders = (token: string) => ({ Authorization: `Bearer ${token}` });

async function login(rc: APIRequestContext, email: string, password: string): Promise<string> {
  const res = await rc.post(`${API}/auth/login`, { data: { email, password } });
  return (await res.json()).accessToken as string;
}

// Identity-only checkout — the server prices it from the DB (product '1').
async function createOrder(rc: APIRequestContext, token: string) {
  const res = await rc.post(`${API}/orders`, {
    headers: authHeaders(token),
    data: {
      customerName: 'Ship Test',
      items: [{ productId: '1', colorId: 'champagne', size: 'XS', quantity: 1 }],
      shippingAddress: { name: 'T', line1: '1 St', city: 'Mumbai', state: 'MH', zip: '400001', country: 'India' },
    },
  });
  return res.json();
}

async function payOrder(rc: APIRequestContext, token: string, orderId: string) {
  await rc.post(`${API}/orders/${orderId}/pay-init`, { headers: authHeaders(token) });
  const mock = await (await rc.post(`${API}/orders/${orderId}/pay-mock`, { headers: authHeaders(token) })).json();
  await rc.post(`${API}/orders/verify`, { headers: authHeaders(token), data: mock });
}

const trackingWebhook = (rc: APIRequestContext, awb: string, status: string, token = MOCK_WEBHOOK_TOKEN) =>
  rc.post(`${API}/webhooks/shiprocket`, {
    headers: { 'Content-Type': 'application/json', 'x-api-key': token },
    data: JSON.stringify({ awb, current_status: status, current_timestamp: '2026-01-01T00:00:00Z' }),
  });

test('admin ships a PAID order; tracking webhook advances it to delivered (idempotent)', async () => {
  const rc = await request.newContext();
  const custToken = await login(rc, CUSTOMER.email, CUSTOMER.password);
  const adminToken = await login(rc, ADMIN.email, ADMIN.password);

  const order = await createOrder(rc, custToken);
  await payOrder(rc, custToken, order.id);

  // Create the shipment.
  const shipped = await (await rc.post(`${API}/admin/orders/${order.id}/ship`, { headers: authHeaders(adminToken) })).json();
  expect(shipped.awb).toBeTruthy();
  expect(shipped.courier).toBeTruthy();
  expect(shipped.shippingStatus).toBe('shipment_created');
  expect(shipped.status).toBe('shipped');
  const awb = shipped.awb as string;

  // Re-ship is idempotent: same AWB, no duplicate.
  const reship = await (await rc.post(`${API}/admin/orders/${order.id}/ship`, { headers: authHeaders(adminToken) })).json();
  expect(reship.awb).toBe(awb);

  // Drive the tracking progression through the webhook (source of truth).
  await trackingWebhook(rc, awb, 'In Transit');
  let cur = await (await rc.get(`${API}/orders/${order.id}`, { headers: authHeaders(custToken) })).json();
  expect(cur.shippingStatus).toBe('in_transit');

  await trackingWebhook(rc, awb, 'Out For Delivery');
  cur = await (await rc.get(`${API}/orders/${order.id}`, { headers: authHeaders(custToken) })).json();
  expect(cur.shippingStatus).toBe('out_for_delivery');

  const del = await trackingWebhook(rc, awb, 'Delivered');
  expect(del.status()).toBe(200);
  cur = await (await rc.get(`${API}/orders/${order.id}`, { headers: authHeaders(custToken) })).json();
  expect(cur.shippingStatus).toBe('delivered');
  expect(cur.status).toBe('delivered');

  // Duplicate delivered event is a no-op (still 200, still delivered).
  const dup = await trackingWebhook(rc, awb, 'Delivered');
  expect(dup.status()).toBe(200);
  cur = await (await rc.get(`${API}/orders/${order.id}`, { headers: authHeaders(custToken) })).json();
  expect(cur.shippingStatus).toBe('delivered');

  // A bad webhook token is rejected.
  const bad = await trackingWebhook(rc, awb, 'Delivered', 'wrong-token');
  expect(bad.status()).toBe(401);

  await rc.dispose();
});

test('shipping a non-paid order is blocked (409)', async () => {
  const rc = await request.newContext();
  const custToken = await login(rc, CUSTOMER.email, CUSTOMER.password);
  const adminToken = await login(rc, ADMIN.email, ADMIN.password);

  const order = await createOrder(rc, custToken); // PENDING (unpaid)
  const res = await rc.post(`${API}/admin/orders/${order.id}/ship`, { headers: authHeaders(adminToken) });
  expect(res.status()).toBe(409);

  const after = await (await rc.get(`${API}/orders/${order.id}`, { headers: authHeaders(custToken) })).json();
  expect(after.shippingStatus).toBe('not_shipped');
  await rc.dispose();
});
