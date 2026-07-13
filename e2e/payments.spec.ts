import { test, expect, request, APIRequestContext } from '@playwright/test';
import crypto from 'node:crypto';
import { CUSTOMER } from './testCredentials';

// Payment verification + webhook, exercised at the mock gateway boundary. The
// signature paths are identical to real Razorpay mode.
//
// Prerequisite: seeded database in mock mode (no RAZORPAY_* set).

const API = 'http://localhost:4000/api';
const MOCK_WEBHOOK_SECRET = 'mock-webhook-secret';

const authHeaders = (token: string) => ({ Authorization: `Bearer ${token}` });
const webhookSig = (body: string) =>
  crypto.createHmac('sha256', MOCK_WEBHOOK_SECRET).update(body).digest('hex');

async function login(rc: APIRequestContext): Promise<string> {
  const res = await rc.post(`${API}/auth/login`, {
    data: { email: CUSTOMER.email, password: CUSTOMER.password },
  });
  return (await res.json()).accessToken as string;
}

async function createOrder(rc: APIRequestContext, token: string) {
  const res = await rc.post(`${API}/orders`, {
    headers: authHeaders(token),
    data: {
      customerName: 'Test Buyer',
      items: [{ productId: '1', name: 'x', image: '', variant: 'y', quantity: 1, price: 100 }],
      subtotal: 100,
      shipping: 0,
      tax: 8,
      total: 108,
      shippingAddress: { name: 'T', line1: '1 St', city: 'NYC', state: 'NY', zip: '10001', country: 'US' },
    },
  });
  return res.json();
}

test('payment verification marks the order PAID, idempotently', async () => {
  const rc = await request.newContext();
  const token = await login(rc);
  const order = await createOrder(rc, token);
  expect(order.paymentStatus).toBe('PENDING');

  const init = await (await rc.post(`${API}/orders/${order.id}/pay-init`, { headers: authHeaders(token) })).json();
  expect(init.mode).toBe('mock');
  expect(init.amount).toBe(10800); // 108 * 100 paise

  const mock = await (await rc.post(`${API}/orders/${order.id}/pay-mock`, { headers: authHeaders(token) })).json();
  const v1 = await (await rc.post(`${API}/orders/verify`, { headers: authHeaders(token), data: mock })).json();
  expect(v1.paymentStatus).toBe('PAID');

  // Double-verify doesn't double-process.
  const v2 = await (await rc.post(`${API}/orders/verify`, { headers: authHeaders(token), data: mock })).json();
  expect(v2.paymentStatus).toBe('PAID');
  await rc.dispose();
});

test('a tampered payment signature is rejected (order stays unpaid)', async () => {
  const rc = await request.newContext();
  const token = await login(rc);
  const order = await createOrder(rc, token);
  await rc.post(`${API}/orders/${order.id}/pay-init`, { headers: authHeaders(token) });
  const mock = await (await rc.post(`${API}/orders/${order.id}/pay-mock`, { headers: authHeaders(token) })).json();

  const tampered = { ...mock, razorpay_signature: `${mock.razorpay_signature.slice(0, -4)}0000` };
  const res = await rc.post(`${API}/orders/verify`, { headers: authHeaders(token), data: tampered });
  expect(res.status()).toBe(400);

  const after = await (await rc.get(`${API}/orders/${order.id}`, { headers: authHeaders(token) })).json();
  expect(after.paymentStatus).not.toBe('PAID');
  await rc.dispose();
});

test('webhook marks PAID even if the browser never verified (idempotent), and rejects bad signatures', async () => {
  const rc = await request.newContext();
  const token = await login(rc);
  const order = await createOrder(rc, token);
  const init = await (await rc.post(`${API}/orders/${order.id}/pay-init`, { headers: authHeaders(token) })).json();

  const body = JSON.stringify({
    event: 'payment.captured',
    payload: { payment: { entity: { id: 'pay_wh_1', order_id: init.razorpayOrderId } } },
  });
  const headers = { 'Content-Type': 'application/json', 'x-razorpay-signature': webhookSig(body) };

  // Fire the same webhook twice — Razorpay retries; must be idempotent.
  const w1 = await rc.post(`${API}/webhooks/razorpay`, { headers, data: body });
  const w2 = await rc.post(`${API}/webhooks/razorpay`, { headers, data: body });
  expect(w1.status()).toBe(200);
  expect(w2.status()).toBe(200);

  const paid = await (await rc.get(`${API}/orders/${order.id}`, { headers: authHeaders(token) })).json();
  expect(paid.paymentStatus).toBe('PAID');

  // A bad signature is rejected.
  const bad = await rc.post(`${API}/webhooks/razorpay`, {
    headers: { 'Content-Type': 'application/json', 'x-razorpay-signature': 'deadbeef' },
    data: body,
  });
  expect(bad.status()).toBe(400);
  await rc.dispose();
});

test('a failed payment webhook leaves the order unpaid (FAILED)', async () => {
  const rc = await request.newContext();
  const token = await login(rc);
  const order = await createOrder(rc, token);
  const init = await (await rc.post(`${API}/orders/${order.id}/pay-init`, { headers: authHeaders(token) })).json();

  const body = JSON.stringify({
    event: 'payment.failed',
    payload: { payment: { entity: { id: 'pay_fail', order_id: init.razorpayOrderId } } },
  });
  await rc.post(`${API}/webhooks/razorpay`, {
    headers: { 'Content-Type': 'application/json', 'x-razorpay-signature': webhookSig(body) },
    data: body,
  });

  const after = await (await rc.get(`${API}/orders/${order.id}`, { headers: authHeaders(token) })).json();
  expect(after.paymentStatus).toBe('FAILED');
  await rc.dispose();
});
