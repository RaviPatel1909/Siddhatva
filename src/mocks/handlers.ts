import { http, HttpResponse, delay } from 'msw';
import { products } from '../data/products';
import { orders as seedOrders } from '../data/orders';
import { getProductById } from '../data/products';
import { Order, OrderItem } from '../types/order';
import { totalsFor } from '../lib/pricing';
import {
  ApiProduct,
  OrderListResponse,
  ProductListResponse,
  WishlistResponse,
} from '../api/types';
import type { AdminSearchResults } from '../api/admin';

// Mock reference implementation of the API contract (src/api/types.ts). Phase 3's
// Express server implements these routes verbatim. Backed by src/data.

const API = '/api';

const slugify = (name: string) =>
  name
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const toApiProduct = (p: (typeof products)[number]): ApiProduct => ({ ...p, slug: slugify(p.name) });

// Dev-only fault injection: set localStorage 'siddhatva:mock-fail' to a resource
// name (e.g. "products") to make that handler return 500 — used to exercise the
// UI's error/retry states.
const shouldFail = (resource: string): boolean => {
  try {
    return (localStorage.getItem('siddhatva:mock-fail') ?? '').split(',').includes(resource);
  } catch {
    return false;
  }
};

// Dev-only latency hook: set localStorage 'siddhatva:mock-delay' to a ms value
// to slow responses and observe loading skeletons.
const mockDelay = async (): Promise<void> => {
  try {
    const ms = Number(localStorage.getItem('siddhatva:mock-delay') ?? 0);
    if (ms > 0) await delay(ms);
  } catch {
    /* ignore */
  }
};

const readPersisted = <T>(key: string): T | null => {
  try {
    const raw = localStorage.getItem(`siddhatva:${key}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { v?: number; data?: unknown };
    return (parsed?.data as T) ?? null;
  } catch {
    return null;
  }
};

const fail = (message = 'Simulated server error') =>
  HttpResponse.json({ message }, { status: 500 });

// Admin search parity with server/src/routes/admin.ts: shortest query that filters,
// and the per-group result cap.
const SEARCH_MIN_CHARS = 2;
const SEARCH_GROUP_LIMIT = 5;

// No standalone customer fixture exists — the only mock data is products + orders
// (src/data). Mock customers are therefore derived from the people who placed the
// seed orders (unique by name), with a deterministic synthesized email so the
// name/email substring match mirrors the real endpoint's shape. Behaviour matches
// Express; only the underlying fixture data differs (the real endpoint reads the
// User table, and matches orders against the related user's name/email — which the
// order fixture can't carry, so mock orders match on customerName instead).
const mockCustomers = Array.from(
  new Map(
    seedOrders.map((o) => {
      const email = `${o.customerName.toLowerCase().replace(/[^a-z0-9]+/g, '.')}@example.com`;
      return [o.customerName, { id: `u_${slugify(o.customerName)}`, name: o.customerName, email }];
    })
  ).values()
);

// Fixed join date for mock customers (no createdAt in the order fixture). Kept
// deterministic so the shape is stable; behaviour, not data, is what parity needs.
const MOCK_CUSTOMER_CREATED_AT = '2023-10-01T00:00:00.000Z';
const CUSTOMERS_PAGE_SIZE = 8;

// Aggregate a mock customer's orders the same way the server does: orderCount over
// ALL their orders (matched by name in the fixture — the mock has no userId link),
// totalSpent over PAID orders only. The fixture carries no paymentStatus, so
// totalSpent is 0 here — a shape-faithful reference, not real spend data.
const customerAggregates = (name: string) => {
  const custOrders = seedOrders.filter((o) => o.customerName === name);
  const totalSpent = Math.round(
    custOrders.reduce((sum, o) => (o.paymentStatus === 'PAID' ? sum + o.total : sum), 0)
  );
  return { orders: custOrders, orderCount: custOrders.length, totalSpent };
};

export const handlers = [
  // GET /products — filter (q/category/color/size/price), sort, paginate, facets.
  http.get(`${API}/products`, async ({ request }) => {
    if (shouldFail('products')) return fail();
    await mockDelay();
    const url = new URL(request.url);
    const q = (url.searchParams.get('q') ?? '').trim().toLowerCase();
    const category = url.searchParams.get('category');
    const color = url.searchParams.get('color');
    const size = url.searchParams.get('size');
    const sort = url.searchParams.get('sort');
    const page = Math.max(1, Number(url.searchParams.get('page') ?? 1));
    const pageSize = Math.max(1, Number(url.searchParams.get('pageSize') ?? 8));

    // Price bounds are whole-rupee integers and are rejected rather than coerced,
    // mirroring the server's Zod schema (docs/API_CONTRACT.md).
    const readPrice = (key: string): number | null | 'invalid' => {
      const raw = url.searchParams.get(key);
      if (raw === null || raw === '') return null;
      const n = Number(raw);
      return Number.isInteger(n) && n >= 0 ? n : 'invalid';
    };
    const minPrice = readPrice('minPrice');
    const maxPrice = readPrice('maxPrice');
    if (minPrice === 'invalid' || maxPrice === 'invalid') {
      return HttpResponse.json({ message: 'Invalid price range' }, { status: 400 });
    }

    // One predicate per filter, so a facet can re-run the set MINUS its own.
    // q: case-insensitive substring on name OR category (parity with admin search).
    const okQ = (p: (typeof products)[number]) =>
      !q || p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
    const okCategory = (p: (typeof products)[number]) => !category || p.category === category;
    const okColor = (p: (typeof products)[number]) =>
      !color || p.colors.some((c) => c.id === color);
    const okSize = (p: (typeof products)[number]) => !size || p.sizes.includes(size);
    const okPrice = (p: (typeof products)[number]) =>
      (minPrice === null || p.price >= minPrice) && (maxPrice === null || p.price <= maxPrice);

    let list = products.filter((p) => okQ(p) && okCategory(p) && okColor(p) && okSize(p) && okPrice(p));
    if (sort === 'price-asc') list = [...list].sort((a, b) => a.price - b.price);
    if (sort === 'price-desc') list = [...list].sort((a, b) => b.price - a.price);

    const total = list.length;
    const items = list.slice((page - 1) * pageSize, page * pageSize).map(toApiProduct);

    // Categories = navigation → whole catalog, so none can vanish behind a
    // refinement and the UI's "All (n)" stays the true catalog total.
    const categoryNames = Array.from(new Set(products.map((p) => p.category)));
    const categories = categoryNames.map((name) => ({
      name,
      count: products.filter((p) => p.category === name).length,
    }));

    // Refinements = context-aware, each computed over every OTHER active filter,
    // so options reflect the current view without a selection hiding its own
    // alternatives (which would trap the shopper).
    const forColors = products.filter((p) => okQ(p) && okCategory(p) && okSize(p) && okPrice(p));
    const forSizes = products.filter((p) => okQ(p) && okCategory(p) && okColor(p) && okPrice(p));
    const forPrice = products.filter((p) => okQ(p) && okCategory(p) && okColor(p) && okSize(p));

    const colorMap = new Map<string, { id: string; name: string; hex: string; count: number }>();
    for (const p of forColors) {
      for (const c of p.colors) {
        const hit = colorMap.get(c.id);
        if (hit) hit.count += 1;
        else colorMap.set(c.id, { id: c.id, name: c.name, hex: c.hex, count: 1 });
      }
    }
    const sizeMap = new Map<string, number>();
    for (const p of forSizes) {
      for (const s of p.sizes) sizeMap.set(s, (sizeMap.get(s) ?? 0) + 1);
    }
    const prices = forPrice.map((p) => p.price);

    const body: ProductListResponse = {
      items,
      total,
      page,
      pageSize,
      facets: {
        categories,
        colors: Array.from(colorMap.values()),
        sizes: Array.from(sizeMap.entries()).map(([value, count]) => ({ value, count })),
        price: {
          min: prices.length ? Math.min(...prices) : 0,
          max: prices.length ? Math.max(...prices) : 0,
        },
      },
    };
    return HttpResponse.json(body);
  }),

  // GET /products/:idOrSlug
  http.get(`${API}/products/:idOrSlug`, async ({ params }) => {
    if (shouldFail('product')) return fail();
    await mockDelay();
    const idOrSlug = String(params.idOrSlug);
    const product =
      getProductById(idOrSlug) ?? products.find((p) => slugify(p.name) === idOrSlug);
    if (!product) return HttpResponse.json({ message: 'Product not found' }, { status: 404 });
    return HttpResponse.json(toApiProduct(product));
  }),

  // GET /orders — bridged to the persisted client store so freshly-placed
  // orders appear; falls back to the seed history.
  http.get(`${API}/orders`, async () => {
    if (shouldFail('orders')) return fail();
    await mockDelay();
    const persisted = readPersisted<Order[]>('orders');
    const items = persisted ?? seedOrders;
    const body: OrderListResponse = { items, total: items.length };
    return HttpResponse.json(body);
  }),

  // POST /orders — the client sends only identity + variant + quantity; the
  // server is authoritative for all money, so (like the real backend) the mock
  // derives every price/total from the catalog rather than trusting the request.
  // Kept in lockstep with server/src/lib/checkout.ts + pricing.ts.
  http.post(`${API}/orders`, async ({ request }) => {
    if (shouldFail('orders')) return fail();
    const body = (await request.json()) as {
      customerName: string;
      items: { productId: string; colorId?: string; size?: string; quantity: number }[];
      shippingAddress: Order['shippingAddress'];
    };

    const items: OrderItem[] = body.items.map((line) => {
      const product = getProductById(line.productId);
      const color = product?.colors.find((c) => c.id === line.colorId);
      return {
        productId: line.productId,
        name: product?.name ?? '',
        image: product?.images[0]?.src ?? '',
        variant: `${color?.name ?? ''} / ${line.size ?? ''}`,
        quantity: line.quantity,
        price: product?.price ?? 0, // DB/catalog price — never the client's
      };
    });
    const subtotal = items.reduce((sum, it) => sum + it.price * it.quantity, 0);
    const totals = totalsFor(subtotal);

    const order: Order = {
      id: `SID-${Math.floor(10000 + Math.random() * 89999)}`,
      customerName: body.customerName,
      date: new Date().toISOString().slice(0, 10),
      status: 'processing',
      paymentStatus: 'PENDING',
      items,
      subtotal: totals.subtotal,
      shipping: totals.shipping,
      tax: totals.tax,
      total: totals.total,
      shippingAddress: body.shippingAddress,
      shippingStatus: 'not_shipped',
    };
    return HttpResponse.json(order, { status: 201 });
  }),

  // GET /admin/search — grouped admin typeahead. Kept in lockstep with Express
  // (server/src/routes/admin.ts) for contract parity: 2-char floor (shorter → empty
  // groups, no filtering), case-insensitive substring match, each group capped at 5.
  http.get(`${API}/admin/search`, async ({ request }) => {
    if (shouldFail('admin-search')) return fail();
    await mockDelay();
    const q = (new URL(request.url).searchParams.get('q') ?? '').trim();
    const empty: AdminSearchResults = { products: [], orders: [], customers: [] };
    if (q.length < SEARCH_MIN_CHARS) return HttpResponse.json(empty);

    const needle = q.toLowerCase();
    const has = (v: string) => v.toLowerCase().includes(needle);
    const body: AdminSearchResults = {
      products: products
        .filter((p) => has(p.name) || has(p.category))
        .slice(0, SEARCH_GROUP_LIMIT)
        .map((p) => ({ id: p.id, name: p.name, sublabel: p.category })),
      orders: seedOrders
        .filter((o) => has(o.id) || has(o.customerName))
        .slice(0, SEARCH_GROUP_LIMIT)
        .map((o) => ({ id: o.id, label: o.id, sublabel: `${o.customerName} · ${o.status}` })),
      customers: mockCustomers
        .filter((c) => has(c.name) || has(c.email))
        .slice(0, SEARCH_GROUP_LIMIT),
    };
    return HttpResponse.json(body);
  }),

  // GET /admin/customers — paginated customer list. Parity reference for the real
  // endpoint (unreachable in MSW: admin has no auth here). Derived from seed-order
  // customers; aggregates computed like the server (all orders / PAID spend).
  http.get(`${API}/admin/customers`, async ({ request }) => {
    if (shouldFail('admin-customers')) return fail();
    await mockDelay();
    const url = new URL(request.url);
    const page = Math.max(1, Number(url.searchParams.get('page') ?? 1));
    const q = (url.searchParams.get('q') ?? '').trim().toLowerCase();
    const matched = mockCustomers.filter(
      (c) => !q || c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
    );
    const rows = matched.map((c) => {
      const { orderCount, totalSpent } = customerAggregates(c.name);
      return { id: c.id, name: c.name, email: c.email, createdAt: MOCK_CUSTOMER_CREATED_AT, orderCount, totalSpent };
    });
    const items = rows.slice((page - 1) * CUSTOMERS_PAGE_SIZE, page * CUSTOMERS_PAGE_SIZE);
    return HttpResponse.json({ items, total: rows.length, page, pageSize: CUSTOMERS_PAGE_SIZE });
  }),

  // GET /admin/customers/:id — one customer + their orders (admin Order DTO).
  http.get(`${API}/admin/customers/:id`, async ({ params }) => {
    if (shouldFail('admin-customer')) return fail();
    await mockDelay();
    const customer = mockCustomers.find((c) => c.id === String(params.id));
    if (!customer) return HttpResponse.json({ message: 'Customer not found' }, { status: 404 });
    const { orders, orderCount, totalSpent } = customerAggregates(customer.name);
    return HttpResponse.json({
      id: customer.id,
      name: customer.name,
      email: customer.email,
      createdAt: MOCK_CUSTOMER_CREATED_AT,
      orderCount,
      totalSpent,
      orders,
    });
  }),

  // GET /wishlist — bridged to the persisted client store.
  http.get(`${API}/wishlist`, async () => {
    if (shouldFail('wishlist')) return fail();
    const ids = readPersisted<string[]>('wishlist') ?? ['7', '8', '9'];
    const items = ids
      .map((id) => getProductById(id))
      .filter((p): p is (typeof products)[number] => Boolean(p))
      .map(toApiProduct);
    const body: WishlistResponse = { items };
    return HttpResponse.json(body);
  }),
];
