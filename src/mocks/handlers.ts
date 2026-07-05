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
