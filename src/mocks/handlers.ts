import { http, HttpResponse, delay } from 'msw';
import { products } from '../data/products';
import { orders as seedOrders } from '../data/orders';
import { getProductById } from '../data/products';
import { Order } from '../types/order';
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

export const handlers = [
  // GET /products — filter (category/color/size), sort, paginate, and facets.
  http.get(`${API}/products`, async ({ request }) => {
    if (shouldFail('products')) return fail();
    await mockDelay();
    const url = new URL(request.url);
    const category = url.searchParams.get('category');
    const color = url.searchParams.get('color');
    const size = url.searchParams.get('size');
    const sort = url.searchParams.get('sort');
    const page = Math.max(1, Number(url.searchParams.get('page') ?? 1));
    const pageSize = Math.max(1, Number(url.searchParams.get('pageSize') ?? 8));

    let list = products.filter((p) => {
      const matchesCategory = !category || p.category === category;
      const matchesColor = !color || p.colors.some((c) => c.id === color);
      const matchesSize = !size || p.sizes.includes(size);
      return matchesCategory && matchesColor && matchesSize;
    });
    if (sort === 'price-asc') list = [...list].sort((a, b) => a.price - b.price);
    if (sort === 'price-desc') list = [...list].sort((a, b) => b.price - a.price);

    const total = list.length;
    const items = list.slice((page - 1) * pageSize, page * pageSize).map(toApiProduct);

    // Facets computed over the whole catalog (category-independent), so the
    // sidebar shows total counts and every available colour.
    const categoryNames = Array.from(new Set(products.map((p) => p.category)));
    const categories = categoryNames.map((name) => ({
      name,
      count: products.filter((p) => p.category === name).length,
    }));
    const colorMap = new Map<string, { id: string; name: string; hex: string }>();
    products.forEach((p) => p.colors.forEach((c) => colorMap.set(c.id, c)));

    const body: ProductListResponse = {
      items,
      total,
      page,
      pageSize,
      facets: { categories, colors: Array.from(colorMap.values()) },
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

  // POST /orders — accept the order and echo it with a server status. The
  // client's OrdersContext persists to the store that GET /orders reads, so the
  // new order round-trips here just as it does against the real backend.
  http.post(`${API}/orders`, async ({ request }) => {
    if (shouldFail('orders')) return fail();
    const order = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ ...order, status: 'processing' }, { status: 201 });
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
