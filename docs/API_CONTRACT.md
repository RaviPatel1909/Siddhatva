# Siddhatva API Contract

This is the single source of truth for the HTTP API shared by the frontend and
backend. It is derived from the frontend's typed client (`src/api/`) and the MSW
mock reference implementation (`src/mocks/handlers.ts`), which the frontend runs
against in development.

**Phase 3's Express server must implement these routes verbatim** — same paths,
params, semantics, and response/error shapes — so the frontend can switch from
the MSW mock to the real server by pointing `VITE_API_URL` at it, with no code
changes.

---

## Conventions

- **Base URL:** configured by `VITE_API_URL` (frontend env), default `/api`. All
  paths below are relative to this base.
- **Method/format:** all current endpoints are `GET` returning JSON. The client
  sends `Accept: application/json`.
- **Auth:** none yet. `/orders` and `/wishlist` are conceptually scoped to the
  signed-in customer; until auth exists they return the single demo customer's
  data.
- **Success:** HTTP `2xx` with the JSON body documented per endpoint.
- **Errors:** any non-`2xx` returns `{ "message": string }`. The client wraps it
  as `ApiError { status, body }` and throws. Documented error statuses per
  endpoint below; a network failure surfaces client-side as `ApiError` with
  `status: 0` (not a server response).

---

## Data types

Shared shapes referenced by multiple endpoints.

### Product / ApiProduct

`ApiProduct` is the catalog `Product` plus a URL `slug`. It is what every
product-returning endpoint sends.

```ts
type ProductBadge  = 'new' | 'limited' | 'sold-out';
type ProductStatus = 'active' | 'draft' | 'out-of-stock';

interface Color        { id: string; name: string; hex: string; }   // hex like "#b87b5a"
interface ProductImage { id: string; src: string; alt: string; }

interface ApiProduct {
  id: string;              // stable catalog id, e.g. "7"
  slug: string;            // derived from name (see "Slug generation")
  name: string;
  price: number;           // USD, major units (e.g. 1250 = $1,250.00)
  description: string;
  images: ProductImage[];  // at least one; images[0] is primary
  colors: Color[];         // at least one
  sizes: string[];         // e.g. ["S","M","L"] or ["One Size"]
  category: string;        // e.g. "Men" | "Women" | "Kids" | "Accessories"
  variant?: string;        // display sub-label, e.g. "Champagne"
  badge?: ProductBadge;
  stock?: number;
  sku?: string;            // e.g. "SID-1007"
  status?: ProductStatus;
}
```

### Order

```ts
type OrderStatus = 'processing' | 'shipped' | 'delivered' | 'cancelled';

interface OrderItem {
  productId: string;
  name: string;
  image: string;
  variant: string;         // e.g. "Champagne / M"
  quantity: number;
  price: number;           // unit price at time of purchase
}

interface Address {
  name: string;
  line1: string;
  city: string;
  state: string;           // may be "" where not applicable
  zip: string;
  country: string;
}

interface Order {
  id: string;              // e.g. "SID-93825"
  customerName: string;
  date: string;            // "YYYY-MM-DD"
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  shipping: number;        // 0 = complimentary
  tax: number;
  total: number;
  shippingAddress: Address;
}
```

---

## Endpoints

### GET `/products`

List catalog products with filtering, sorting, pagination, and facets.

**Query params** (all optional):

| Param      | Type   | Default    | Semantics |
|------------|--------|------------|-----------|
| `category` | string | (none)     | Exact match on `product.category`. e.g. `Men` → the 5 Men products. |
| `color`    | string | (none)     | Match if **any** of `product.colors` has `id === color`. |
| `size`     | string | (none)     | Match if `product.sizes` **includes** the exact value. |
| `sort`     | enum   | `featured` | `price-asc` (ascending price), `price-desc` (descending price). `featured` or any other value / absent → catalog insertion order (stable). |
| `page`     | number | `1`        | 1-based page index; values `< 1` are clamped to `1`. |
| `pageSize` | number | `8`        | Items per page; values `< 1` are clamped to `1`. |

**Filtering:** the three filters combine with **AND**. Unknown params are ignored.

**Pagination:** applied **after** filter + sort. `total` is the filtered count
(before slicing). `items = filtered[(page-1)*pageSize : page*pageSize]`.

**Facets:** computed over the **entire catalog**, independent of the active
filters (so the UI can show full category counts and every available colour even
while filtered).
- `facets.categories`: each distinct `category` (in first-seen order) with
  `count` = number of products in that category across the whole catalog.
- `facets.colors`: each distinct colour by `id` across the whole catalog (in
  first-seen order), as `{ id, name, hex }`.

**Response `200`** — `ProductListResponse`:

```ts
interface ProductListResponse {
  items: ApiProduct[];
  total: number;      // filtered count, pre-pagination
  page: number;       // echoed (clamped) page
  pageSize: number;   // echoed (clamped) pageSize
  facets: {
    categories: { name: string; count: number }[];
    colors: { id: string; name: string; hex: string }[];
  };
}
```

**Example:** `GET /products?category=Men&sort=price-asc&page=1&pageSize=3`

```jsonc
{
  "items": [ /* 3 ApiProduct, cheapest Men first */ ],
  "total": 5,                       // 5 Men products match
  "page": 1,
  "pageSize": 3,
  "facets": {
    "categories": [
      { "name": "Women", "count": 4 },
      { "name": "Accessories", "count": 5 },
      { "name": "Men", "count": 5 }
    ],
    "colors": [ { "id": "bronze", "name": "Warm Bronze", "hex": "#b87b5a" } /* … */ ]
  }
}
```

**Errors:** `500 { "message": string }` on server error.

---

### GET `/products/:idOrSlug`

Fetch one product, resolvable by **either** its `id` **or** its `slug`.

**Path param:** `idOrSlug` — matched against `product.id` first, then against the
generated `slug`.

**Response `200`** — a single `ApiProduct`.

**Errors:**
- `404 { "message": "Product not found" }` when no product matches.
- `500 { "message": string }` on server error.

**Examples:**
- `GET /products/7` → the product with id `7` (Bespoke Chelsea Boots).
- `GET /products/pure-cashmere-scarf` → same product resolved by slug (id `8`).
- `GET /products/nope` → `404`.

---

### GET `/orders`

The signed-in customer's orders, **newest first**.

> Mock note: the MSW handler serves orders from the persisted client store
> (`localStorage siddhatva:orders`, newest-first because the client prepends new
> orders), falling back to the seed history when empty. The real server owns this
> data and must return the customer's orders newest-first.

**Response `200`** — `OrderListResponse`:

```ts
interface OrderListResponse {
  items: Order[];
  total: number;   // items.length
}
```

**Errors:** `500 { "message": string }` on server error.

---

### GET `/wishlist`

The signed-in customer's saved products.

> Mock note: served from the persisted client store (`localStorage
> siddhatva:wishlist`, an array of product ids), resolved to full products.
> The app currently keeps wishlist **selection** in client state; this endpoint
> is part of the contract for when it moves server-side.

**Response `200`** — `WishlistResponse`:

```ts
interface WishlistResponse {
  items: ApiProduct[];
}
```

**Errors:** `500 { "message": string }` on server error.

---

## Error model (summary)

| Status | Body                              | When |
|--------|-----------------------------------|------|
| `404`  | `{ "message": "Product not found" }` | `GET /products/:idOrSlug` with no match |
| `500`  | `{ "message": string }`           | Any server-side failure |

The frontend client throws `ApiError { message, status, body }` for every
non-`2xx`; a transport failure throws `ApiError` with `status: 0`.

---

## Slug generation

Slugs must be generated identically on both sides so `GET /products/:slug`
resolves. Algorithm (from `name`):

1. Lowercase.
2. Remove apostrophes (`'` and `’`).
3. Replace every run of non-`[a-z0-9]` characters with a single `-`.
4. Trim leading/trailing `-`.

Examples: `"L'Artiste Silk Blazer"` → `l-artiste-silk-blazer`;
`"Pure Cashmere Scarf"` → `pure-cashmere-scarf`.

---

## Not part of the contract (mock-only dev hooks)

These exist only in the MSW mock to exercise UI states and **must not** be
implemented by the server:

- `localStorage siddhatva:mock-fail` — comma-separated resource names
  (`products`, `product`, `orders`, `wishlist`) forced to return `500`.
- `localStorage siddhatva:mock-delay` — milliseconds of artificial latency, to
  observe loading skeletons.
