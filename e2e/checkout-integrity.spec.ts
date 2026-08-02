import { test, expect, request, APIRequestContext } from '@playwright/test';
import { ADMIN, CUSTOMER } from './testCredentials';

// Checkout integrity — the C1 security fix. Proves the SERVER is authoritative for
// all money: client-supplied prices/subtotals/totals/discounts are ignored, prices
// come from the DB, stock + variant + sellability are validated, and the amount
// charged (pay-init) always derives from the stored server total. Historical
// orders keep the price they were charged even after the catalog price changes.
//
// Prerequisite: seeded database in mock mode (no RAZORPAY_* set).

const API = 'http://localhost:4000/api';
const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

// Pricing mirror (server/src/lib/pricing.ts) — the test computes its OWN expected
// figures independently, so a server that trusted the client would fail these.
const shippingFor = (s: number) => (s === 0 || s > 2500 ? 0 : 15);
const taxFor = (s: number) => Math.round(s * 0.08);
const totalFor = (s: number) => s + shippingFor(s) + taxFor(s);

async function login(rc: APIRequestContext, who: { email: string; password: string }): Promise<string> {
  const res = await rc.post(`${API}/auth/login`, { data: who });
  expect(res.ok(), 'login should succeed').toBeTruthy();
  return (await res.json()).accessToken as string;
}

const address = { name: 'T', line1: '1 St', city: 'Mumbai', state: 'MH', zip: '400001', country: 'India' };

// An isolated product we fully control (price + a single champagne/M variant with
// stock 5), so value assertions are exact and don't disturb the shared seed.
const TP_PRICE = 1000;
const TP_COLOR = 'champagne';
const TP_SIZE = 'M';

let rc: APIRequestContext;
let customerToken: string;
let adminToken: string;
let tpId: string;

test.beforeAll(async () => {
  rc = await request.newContext();
  customerToken = await login(rc, CUSTOMER);
  adminToken = await login(rc, ADMIN);

  // Reuse product 1's category + the existing champagne colour so no new catalog
  // facet is introduced; only the product row (deleted below) is added.
  const product1 = await (await rc.get(`${API}/products/1`)).json();
  const created = await rc.post(`${API}/admin/products`, {
    headers: auth(adminToken),
    data: {
      name: 'Checkout Integrity Test Piece',
      price: TP_PRICE,
      description: 'Ephemeral test product.',
      category: product1.category,
      status: 'active',
      colors: [{ id: TP_COLOR, name: 'Champagne', hex: '#d4a574' }],
      sizes: [TP_SIZE],
      variants: [{ colorId: TP_COLOR, size: TP_SIZE, stock: 5 }],
      images: [{ url: 'https://example.com/tp.jpg', publicId: null, alt: 'tp' }],
    },
  });
  expect(created.status(), 'admin creates the test product').toBe(201);
  tpId = (await created.json()).id;
});

test.afterAll(async () => {
  if (tpId) await rc.delete(`${API}/admin/products/${tpId}`, { headers: auth(adminToken) });
  await rc.dispose();
});

// Post a create-order body and return the response + parsed json.
async function postOrder(data: unknown) {
  const res = await rc.post(`${API}/orders`, { headers: auth(customerToken), data });
  return { res, body: await res.json().catch(() => null) };
}

const tpLine = (quantity: number, extra: Record<string, unknown> = {}) => ({
  productId: tpId,
  colorId: TP_COLOR,
  size: TP_SIZE,
  quantity,
  ...extra,
});

test.describe('checkout integrity — server is authoritative for money', () => {
  test('normal checkout: every amount is computed from the DB price', async () => {
    const { res, body } = await postOrder({ customerName: 'A', items: [tpLine(1)], shippingAddress: address });
    expect(res.status()).toBe(201);
    expect(body.paymentStatus).toBe('PENDING');
    expect(body.items).toHaveLength(1);
    expect(body.items[0].price).toBe(TP_PRICE);
    expect(body.items[0].variant).toBe('Champagne / M');
    expect(body.subtotal).toBe(1000);
    expect(body.shipping).toBe(15); // ≤ 2500 → flat shipping
    expect(body.tax).toBe(80); // round(1000 * 0.08)
    expect(body.total).toBe(1095);
  });

  test('quantity calculation: lineTotal = dbPrice × quantity', async () => {
    const { body } = await postOrder({ customerName: 'A', items: [tpLine(3)], shippingAddress: address });
    expect(body.items[0].quantity).toBe(3);
    expect(body.items[0].price).toBe(TP_PRICE);
    expect(body.subtotal).toBe(3000);
    expect(body.total).toBe(totalFor(3000)); // 3000 + 0 + 240
  });

  test('multiple products are each priced from the DB and summed', async () => {
    const product1 = await (await rc.get(`${API}/products/1`)).json();
    const { body } = await postOrder({
      customerName: 'A',
      items: [tpLine(1), { productId: '1', colorId: 'champagne', size: 'S', quantity: 1 }],
      shippingAddress: address,
    });
    expect(body.items).toHaveLength(2);
    const expectedSubtotal = TP_PRICE + product1.price;
    expect(body.subtotal).toBe(expectedSubtotal);
    expect(body.total).toBe(totalFor(expectedSubtotal));
  });

  // --- The core C1 security assertions -------------------------------------

  test('tampered monetary fields (price/subtotal/total/tax/shipping/discount) are ignored', async () => {
    const { res, body } = await postOrder({
      id: 'SID-EVIL',
      date: '2000-01-01',
      customerName: 'Attacker',
      items: [tpLine(1, { price: 1, name: 'spoof', image: 'spoof' })],
      subtotal: 0,
      shipping: 9999,
      tax: 0,
      total: 1,
      discount: 100000,
      shippingAddress: address,
    });
    expect(res.status()).toBe(201);
    // Server recomputed everything from the DB — the tampered values had no effect.
    expect(body.items[0].price).toBe(TP_PRICE);
    expect(body.subtotal).toBe(1000);
    expect(body.shipping).toBe(15);
    expect(body.tax).toBe(80);
    expect(body.total).toBe(1095);
    // The client-chosen id/name are ignored too (server-generated id, DB name).
    expect(body.id).not.toBe('SID-EVIL');
    expect(body.items[0].name).toBe('Checkout Integrity Test Piece');
  });

  test('price: 1 does not let a shopper underpay', async () => {
    const { body } = await postOrder({
      customerName: 'A',
      items: [tpLine(2, { price: 1 })],
      total: 2,
      shippingAddress: address,
    });
    expect(body.total).toBe(totalFor(2000)); // 2175 — the real price, not 2
  });

  test('the pay-init amount comes from the stored server total, not the request', async () => {
    const { body: order } = await postOrder({
      customerName: 'A',
      items: [tpLine(2)],
      subtotal: 1,
      total: 1, // attacker attempt
      shippingAddress: address,
    });
    expect(order.total).toBe(2175);
    const init = await (await rc.post(`${API}/orders/${order.id}/pay-init`, { headers: auth(customerToken) })).json();
    expect(init.amount).toBe(Math.round(order.total * 100)); // 217500 paise, not 100
  });

  // --- Stock, variant, and product validation ------------------------------

  test('insufficient stock is rejected (422)', async () => {
    // product 1 champagne/XS has seeded stock 1 — requesting 2 must fail.
    const { res } = await postOrder({
      customerName: 'A',
      items: [{ productId: '1', colorId: 'champagne', size: 'XS', quantity: 2 }],
      shippingAddress: address,
    });
    expect(res.status()).toBe(422);
  });

  test('duplicate lines of one variant merge before the stock check (no bypass)', async () => {
    // Two lines of champagne/XS (stock 1) at qty 1 each → merged 2 > 1 → 422.
    const { res } = await postOrder({
      customerName: 'A',
      items: [
        { productId: '1', colorId: 'champagne', size: 'XS', quantity: 1 },
        { productId: '1', colorId: 'champagne', size: 'XS', quantity: 1 },
      ],
      shippingAddress: address,
    });
    expect(res.status()).toBe(422);
  });

  test('duplicate lines of an in-stock variant merge into one summed item', async () => {
    const { body } = await postOrder({
      customerName: 'A',
      items: [tpLine(1), tpLine(2)], // merged → qty 3, within stock 5
      shippingAddress: address,
    });
    expect(body.items).toHaveLength(1);
    expect(body.items[0].quantity).toBe(3);
    expect(body.total).toBe(totalFor(3000));
  });

  test('an unknown / deleted product id is rejected (422)', async () => {
    const { res } = await postOrder({
      customerName: 'A',
      items: [{ productId: 'no-such-product', colorId: 'x', size: 'M', quantity: 1 }],
      shippingAddress: address,
    });
    expect(res.status()).toBe(422);
  });

  test('an inactive (draft) product cannot be purchased (422)', async () => {
    await rc.patch(`${API}/admin/products/${tpId}`, { headers: auth(adminToken), data: { status: 'draft' } });
    try {
      const { res } = await postOrder({ customerName: 'A', items: [tpLine(1)], shippingAddress: address });
      expect(res.status()).toBe(422);
    } finally {
      await rc.patch(`${API}/admin/products/${tpId}`, { headers: auth(adminToken), data: { status: 'active' } });
    }
  });

  test('a quantity above stock but within the cap is a 422, not oversold', async () => {
    const { res } = await postOrder({ customerName: 'A', items: [tpLine(6)], shippingAddress: address }); // stock 5
    expect(res.status()).toBe(422);
  });

  // --- Input validation (400 from Zod) -------------------------------------

  test('zero, negative, fractional, and over-cap quantities fail validation (400)', async () => {
    for (const quantity of [0, -1, 1.5, 101]) {
      const { res } = await postOrder({ customerName: 'A', items: [tpLine(quantity)], shippingAddress: address });
      expect(res.status(), `quantity=${quantity} should be a 400`).toBe(400);
    }
  });

  // --- Price change + historical integrity ---------------------------------

  test('a new order uses the latest price; a completed order keeps what it was charged', async () => {
    // 1) Place + PAY an order at the original price.
    const { body: original } = await postOrder({ customerName: 'A', items: [tpLine(1)], shippingAddress: address });
    expect(original.total).toBe(1095);
    await rc.post(`${API}/orders/${original.id}/pay-init`, { headers: auth(customerToken) });
    const mock = await (await rc.post(`${API}/orders/${original.id}/pay-mock`, { headers: auth(customerToken) })).json();
    const paid = await (await rc.post(`${API}/orders/verify`, { headers: auth(customerToken), data: mock })).json();
    expect(paid.paymentStatus).toBe('PAID');

    // 2) Admin raises the catalog price.
    await rc.patch(`${API}/admin/products/${tpId}`, { headers: auth(adminToken), data: { price: 2000 } });
    try {
      // 3) A NEW order reflects the new price.
      const { body: fresh } = await postOrder({ customerName: 'A', items: [tpLine(1)], shippingAddress: address });
      expect(fresh.items[0].price).toBe(2000);
      expect(fresh.total).toBe(totalFor(2000)); // 2175

      // 4) The already-completed order is unchanged — historical integrity.
      const historical = await (await rc.get(`${API}/orders/${original.id}`, { headers: auth(customerToken) })).json();
      expect(historical.items[0].price).toBe(TP_PRICE); // still 1000
      expect(historical.total).toBe(1095);
    } finally {
      await rc.patch(`${API}/admin/products/${tpId}`, { headers: auth(adminToken), data: { price: TP_PRICE } });
    }
  });

  // --- Free-shipping threshold boundary ------------------------------------

  // The waiver is a STRICT `subtotal > FREE_SHIPPING_THRESHOLD`, and the banner
  // says "over ₹2,500" to match — so ₹2,500 exactly is still charged shipping.
  // Both sides plus the exact boundary are asserted here, because an off-by-one
  // (> flipped to >=) is invisible anywhere except at that single rupee.
  test('free shipping applies strictly ABOVE ₹2,500 — boundary is charged', async () => {
    const cases = [
      { price: 2499, shipping: 15, label: 'below the threshold' },
      { price: 2500, shipping: 15, label: 'exactly at the threshold (not "over")' },
      { price: 2501, shipping: 0, label: 'above the threshold' },
    ];
    try {
      for (const { price, shipping, label } of cases) {
        await rc.patch(`${API}/admin/products/${tpId}`, { headers: auth(adminToken), data: { price } });
        const { body } = await postOrder({ customerName: 'A', items: [tpLine(1)], shippingAddress: address });
        expect(body.subtotal, label).toBe(price);
        expect(body.shipping, label).toBe(shipping);
        expect(body.total, label).toBe(price + shipping + Math.round(price * 0.08));
      }
    } finally {
      await rc.patch(`${API}/admin/products/${tpId}`, { headers: auth(adminToken), data: { price: TP_PRICE } });
    }
  });
});
