import { test, expect, request, APIRequestContext } from '@playwright/test';
import { ADMIN, CUSTOMER } from './testCredentials';

// Analytics API (/admin/analytics/*). Exercised directly against the API with an
// admin session — consistent with the project's e2e-only suite (no unit runner).
// Covers: admin guard, valid shapes, Zod validation (400, not coerced), the
// zero-state on an empty window, PAID-only + date-filtered aggregation (delta
// based, robust to other specs' data), and granularity switching.
//
// Prerequisite: seeded database in mock mode (no RAZORPAY_* set).

const API = 'http://localhost:4000/api';
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
const pad2 = (n: number) => String(n).padStart(2, '0');

// Today's date as an IST calendar day (matches the server's bucketing timezone).
function istTodayStr(): string {
  const ist = new Date(Date.now() + 330 * 60_000);
  return `${ist.getUTCFullYear()}-${pad2(ist.getUTCMonth() + 1)}-${pad2(ist.getUTCDate())}`;
}

async function login(rc: APIRequestContext, who: { email: string; password: string }): Promise<string> {
  const res = await rc.post(`${API}/auth/login`, { data: who });
  expect(res.ok(), 'login should succeed').toBeTruthy();
  return (await res.json()).accessToken as string;
}

// Two distinct variants of product '1' at qty 1 each → 2 units sold, and both fit
// the seeded per-variant stock. The total is computed server-side from DB prices;
// callers read it back off the returned order rather than dictating it.
async function createOrder(rc: APIRequestContext, token: string) {
  const res = await rc.post(`${API}/orders`, {
    headers: auth(token),
    data: {
      customerName: 'Analytics Buyer',
      items: [
        { productId: '1', colorId: 'champagne', size: 'XS', quantity: 1 },
        { productId: '1', colorId: 'taupe', size: 'XS', quantity: 1 },
      ],
      shippingAddress: { name: 'T', line1: '1 St', city: 'Mumbai', state: 'MH', zip: '400001', country: 'India' },
    },
  });
  return res.json();
}

async function payOrder(rc: APIRequestContext, token: string, orderId: string) {
  await rc.post(`${API}/orders/${orderId}/pay-init`, { headers: auth(token) });
  const mock = await (await rc.post(`${API}/orders/${orderId}/pay-mock`, { headers: auth(token) })).json();
  const verified = await (await rc.post(`${API}/orders/verify`, { headers: auth(token), data: mock })).json();
  expect(verified.paymentStatus).toBe('PAID');
}

test.describe('analytics API', () => {
  test('requires an admin session (401 without a token)', async () => {
    const rc = await request.newContext();
    const res = await rc.get(`${API}/admin/analytics/overview`);
    expect(res.status()).toBe(401);
    await rc.dispose();
  });

  test('valid requests return the documented shapes', async () => {
    const rc = await request.newContext();
    const token = await login(rc, ADMIN);

    const overview = await (await rc.get(`${API}/admin/analytics/overview`, { headers: auth(token) })).json();
    for (const k of ['revenue', 'orders', 'paidOrders', 'customers', 'averageOrderValue', 'lowStock', 'outOfStock', 'reviews']) {
      expect(typeof overview[k], `overview.${k}`).toBe('number');
    }

    const revenue = await (await rc.get(`${API}/admin/analytics/revenue`, { headers: auth(token) })).json();
    expect(Array.isArray(revenue)).toBeTruthy();
    for (const p of revenue) {
      expect(typeof p.date).toBe('string');
      expect(typeof p.revenue).toBe('number');
      expect(typeof p.orders).toBe('number');
    }

    const orders = await (await rc.get(`${API}/admin/analytics/orders`, { headers: auth(token) })).json();
    // The three independent axes must all be present and complete.
    expect(Object.keys(orders.fulfillment).sort()).toEqual(['cancelled', 'delivered', 'processing', 'shipped']);
    expect(Object.keys(orders.payment).sort()).toEqual(['failedPayment', 'paid', 'pendingPayment']);
    expect(Object.keys(orders.shipping).sort()).toEqual(
      ['cancelled', 'delivered', 'inTransit', 'notShipped', 'outForDelivery', 'shipmentCreated']
    );

    const products = await (await rc.get(`${API}/admin/analytics/products`, { headers: auth(token) })).json();
    expect(Array.isArray(products)).toBeTruthy();
    expect(products.length).toBeLessThanOrEqual(10);

    const customers = await (await rc.get(`${API}/admin/analytics/customers`, { headers: auth(token) })).json();
    expect(typeof customers.newCustomers).toBe('number');
    expect(typeof customers.returningCustomers).toBe('number');
    expect(Array.isArray(customers.registrationsOverTime)).toBeTruthy();

    await rc.dispose();
  });

  test('invalid query parameters are rejected (400, never coerced)', async () => {
    const rc = await request.newContext();
    const token = await login(rc, ADMIN);

    const bad = [
      '/admin/analytics/revenue?granularity=hourly', // invalid enum
      '/admin/analytics/revenue?from=2026-13-01', // impossible month
      '/admin/analytics/revenue?from=2026-02-30', // impossible day
      '/admin/analytics/overview?from=not-a-date',
      '/admin/analytics/overview?from=2026-02-01&to=2026-01-01', // from > to
      '/admin/analytics/products?limit=0', // below min
      '/admin/analytics/products?limit=abc', // non-numeric
    ];
    for (const path of bad) {
      const res = await rc.get(`${API}${path}`, { headers: auth(token) });
      expect(res.status(), `expected 400 for ${path}`).toBe(400);
      expect((await res.json()).message).toBe('Validation failed');
    }
    await rc.dispose();
  });

  test('empty window returns an honest zero-state (no nulls, no fabricated data)', async () => {
    const rc = await request.newContext();
    const token = await login(rc, ADMIN);
    const far = 'from=2099-01-01&to=2099-01-02';

    const overview = await (await rc.get(`${API}/admin/analytics/overview?${far}`, { headers: auth(token) })).json();
    expect(overview.revenue).toBe(0);
    expect(overview.orders).toBe(0);
    expect(overview.paidOrders).toBe(0);
    expect(overview.customers).toBe(0);
    expect(overview.averageOrderValue).toBe(0);
    expect(overview.reviews).toBe(0);
    // Inventory is current-state, never date-filtered — numbers, not zeroed by the window.
    expect(typeof overview.lowStock).toBe('number');
    expect(typeof overview.outOfStock).toBe('number');

    const revenue = await (await rc.get(`${API}/admin/analytics/revenue?${far}`, { headers: auth(token) })).json();
    expect(revenue.length).toBeGreaterThan(0); // zero-filled buckets, not an empty array
    expect(revenue.every((p: { revenue: number; orders: number }) => p.revenue === 0 && p.orders === 0)).toBeTruthy();

    const orders = await (await rc.get(`${API}/admin/analytics/orders?${far}`, { headers: auth(token) })).json();
    const allCounts = [...Object.values(orders.fulfillment), ...Object.values(orders.payment), ...Object.values(orders.shipping)];
    expect(allCounts.every((n) => n === 0)).toBeTruthy();

    const customers = await (await rc.get(`${API}/admin/analytics/customers?${far}`, { headers: auth(token) })).json();
    expect(customers.newCustomers).toBe(0);
    expect(customers.returningCustomers).toBe(0);
    expect(customers.registrationsOverTime.every((p: { count: number }) => p.count === 0)).toBeTruthy();

    await rc.dispose();
  });

  test('aggregation counts PAID orders only and respects the date filter', async () => {
    const rc = await request.newContext();
    const adminToken = await login(rc, ADMIN);
    const customerToken = await login(rc, CUSTOMER);
    const today = istTodayStr();
    const window = `from=${today}&to=${today}`;

    const overviewToday = async () =>
      (await rc.get(`${API}/admin/analytics/overview?${window}`, { headers: auth(adminToken) })).json();
    const revenueTodayBucket = async () => {
      const series = await (
        await rc.get(`${API}/admin/analytics/revenue?${window}&granularity=day`, { headers: auth(adminToken) })
      ).json();
      return series.find((p: { date: string }) => p.date === today);
    };

    const before = await overviewToday();
    const beforeBucket = await revenueTodayBucket();
    expect(beforeBucket, 'today bucket exists in the day series').toBeTruthy();

    // Create a PENDING order — it must NOT move revenue/paidOrders (PAID-only rule).
    const order = await createOrder(rc, customerToken);
    expect(order.paymentStatus).toBe('PENDING');
    expect(order.total).toBeGreaterThan(0); // server-priced from the DB

    const afterCreate = await overviewToday();
    expect(afterCreate.orders).toBe(before.orders + 1); // all orders counts it
    expect(afterCreate.paidOrders).toBe(before.paidOrders); // unchanged — not paid
    expect(afterCreate.revenue).toBe(before.revenue); // unchanged — PAID only

    // Pay it — now revenue + paidOrders move by exactly this order.
    await payOrder(rc, customerToken, order.id);

    const afterPay = await overviewToday();
    expect(afterPay.paidOrders).toBe(before.paidOrders + 1);
    expect(afterPay.revenue).toBe(before.revenue + order.total);

    const afterBucket = await revenueTodayBucket();
    expect(afterBucket.revenue).toBe(beforeBucket.revenue + order.total);
    expect(afterBucket.orders).toBe(beforeBucket.orders + 1);

    // The far-past-only window must exclude today's order entirely (date filtering).
    const pastOnly = await (
      await rc.get(`${API}/admin/analytics/overview?from=2000-01-01&to=2000-01-02`, { headers: auth(adminToken) })
    ).json();
    expect(pastOnly.orders).toBe(0);
    expect(pastOnly.revenue).toBe(0);

    // Top products (PAID only) now includes the purchased product.
    const products = await (await rc.get(`${API}/admin/analytics/products`, { headers: auth(adminToken) })).json();
    const row = products.find((p: { productId: string }) => p.productId === '1');
    expect(row, 'product 1 present after a paid purchase').toBeTruthy();
    expect(row.unitsSold).toBeGreaterThanOrEqual(2);

    await rc.dispose();
  });

  test('granularity switches the bucket shape and date format', async () => {
    const rc = await request.newContext();
    const token = await login(rc, ADMIN);
    const range = 'from=2026-01-01&to=2026-03-31';

    const byDay = await (await rc.get(`${API}/admin/analytics/revenue?${range}&granularity=day`, { headers: auth(token) })).json();
    const byMonth = await (await rc.get(`${API}/admin/analytics/revenue?${range}&granularity=month`, { headers: auth(token) })).json();

    expect(byMonth.length).toBe(3); // Jan, Feb, Mar
    expect(byDay.length).toBeGreaterThan(byMonth.length);
    expect(byDay[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(byMonth[0].date).toMatch(/^\d{4}-\d{2}$/);
    expect(byMonth[0].date).toBe('2026-01');

    await rc.dispose();
  });
});
