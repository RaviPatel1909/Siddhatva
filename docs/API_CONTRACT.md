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
- **Auth:** JWT access token (Bearer) + rotating httpOnly refresh cookie. See
  [Authentication](#authentication). `/orders` and `/wishlist` are scoped to the
  authenticated user; `/admin/*` require the `ADMIN` role.
- **Money:** all amounts are **INR** in **whole rupees** (product `price` and order
  `subtotal`/`shipping`/`tax`/`total`). Checkout rounds tax so totals stay integer;
  the displayed ₹ total therefore equals the Razorpay charge (`amount = total×100`
  paise). The frontend renders every amount via `formatPrice` (₹, Indian grouping).
- **Success:** HTTP `2xx` with the JSON body documented per endpoint.
- **Errors:** any non-`2xx` returns `{ "message": string }`. The client wraps it
  as `ApiError { status, body }` and throws. Documented error statuses per
  endpoint below; a network failure surfaces client-side as `ApiError` with
  `status: 0` (not a server response).

---

## Authentication

**Token model.** Login/register return a short-lived **access token** (JWT, ~15 min)
in the JSON body and set a **refresh token** as an `httpOnly`, `secure` (prod),
`sameSite` cookie scoped to `/api/auth`. Clients send the access token as
`Authorization: Bearer <token>` on protected requests. When it expires (401),
the client calls `POST /auth/refresh` (cookie sent automatically) to rotate the
refresh token and mint a new access token, then retries once.

**Roles.** `User.role` is `CUSTOMER` or `ADMIN`. `requireAuth` → 401 when the
access token is missing/invalid; `requireAdmin` → 403 when the role is not `ADMIN`.

`PublicUser = { id: string; email: string; name: string; role: 'CUSTOMER' | 'ADMIN' }`

| Endpoint | Body | Success | Notes |
|----------|------|---------|-------|
| `POST /auth/register` | `{ email, name, password }` (password ≥ 8) | `201 { user: PublicUser, accessToken }` + refresh cookie | `409` if email taken |
| `POST /auth/login` | `{ email, password }` | `200 { user, accessToken }` + refresh cookie | `401` on bad credentials |
| `POST /auth/refresh` | — (refresh cookie) | `200 { user, accessToken }` + rotated cookie | `401` if missing/expired/reused; reuse revokes the whole token family |
| `POST /auth/logout` | — (refresh cookie) | `200 { ok: true }`, clears cookie | revokes the presented refresh token |
| `POST /auth/forgot-password` | `{ email }` | `200 { ok: true, message }` | **always identical** whether or not the email exists (no account enumeration); rate-limited. If it exists, emails a reset link (`/reset-password?token=…`, token valid 1h) via the EmailService (dev → `server/.mail/`). |
| `POST /auth/reset-password` | `{ token, newPassword }` (password ≥ 8) | `200 { ok: true }` | validates the token (exists / not used / not expired — else `400`), sets the new bcrypt hash, marks the token **used (single-use)**, and **revokes all refresh tokens** (logout everywhere). Rate-limited. |
| `GET /auth/me` | — (Bearer) | `200 { user }` | `401` if unauthenticated |

Validation errors return `400 { message: "Validation failed", issues: [...] }`.

Password reset stores only the **sha256 hash** of the token (never the raw token).
Dev-only hook `POST /auth/reset-token-dev { email } → { token }` returns the last
raw token for testing (404 in production) — mock-only, not part of the contract.

**Which routes require auth:**

| Route | Requirement |
|-------|-------------|
| `GET /products`, `GET /products/:idOrSlug`, `GET /site/home` | public |
| `GET`/`POST /orders` | authenticated (scoped to the user) |
| `GET`/`POST`/`DELETE /wishlist` | authenticated (scoped to the user) |
| `/admin/*` (orders, stats, products CRUD, uploads, order status) | authenticated **+ ADMIN** |

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
  price: number;           // INR, whole rupees (e.g. 6490 = ₹6,490)
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

// Normalized shipping status — distinct from fulfillment `status` and
// `paymentStatus`. The Shiprocket tracking webhook is its source of truth.
type ShippingStatus =
  | 'not_shipped' | 'shipment_created' | 'in_transit'
  | 'out_for_delivery' | 'delivered' | 'cancelled';

interface Order {
  id: string;              // e.g. "SID-93825"
  customerName: string;
  date: string;            // "YYYY-MM-DD"
  status: OrderStatus;
  paymentStatus: PaymentStatus;  // 'PENDING' | 'PAID' | 'FAILED'
  items: OrderItem[];
  subtotal: number;
  shipping: number;        // 0 = complimentary
  tax: number;
  total: number;
  shippingAddress: Address;
  shippingStatus: ShippingStatus;   // always present
  awb?: string;            // present once a shipment exists
  courier?: string;
  trackingUrl?: string;    // courier tracking page (customer-facing)
  labelUrl?: string;       // shipping label PDF (admin)
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

### POST `/orders`

Create an order — the checkout write path. Persists the order and returns it in
the same shape `GET /orders` returns.

**Request body** (`application/json`) — `CreateOrderInput`:

```ts
interface CreateOrderInput {
  id?: string;   // client-supplied; server generates one if absent
  date?: string; // "YYYY-MM-DD"; server uses today if absent
  customerName: string;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  shippingAddress: Address;
}
```

`status` is assigned server-side (`processing`).

**Response `201`** — the created `Order`.

**Errors:**
- `400 { "message": "Validation failed", "issues": [...] }` on invalid input.
- `500 { "message": string }` on server error.

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

#### POST `/wishlist` `{ productId }` / DELETE `/wishlist/:productId`

Add or remove a saved product. Both return the updated `WishlistResponse`
(`200`/`201`). `POST` 404s (`{ "message": "Product not found" }`) for an unknown
product. (The app currently keeps wishlist selection in client state, so these
are part of the contract but not yet consumed by the UI.)

---

## Site content

Fixed-slot home page content (not a page builder).

| Endpoint | Body | Success | Notes |
|----------|------|---------|-------|
| `GET /site/home` | — | `200 HomeContent` | public; returns stored content or the default (never empty) |
| `PATCH /admin/site/home` | `HomeContent` | `200 HomeContent` | ADMIN; full replace, Zod-validated |

```ts
interface HomeContent {
  hero: { image; headline; subheadline; primaryCtaLabel; primaryCtaHref; secondaryCtaLabel; secondaryCtaHref };
  philosophy: { image; heading; body };
  collectionCards: { image; label; href }[]; // exactly 3
  newsletter: { heading; subtext };
}
```

Images are uploaded through the same image store as products (`GET
/admin/upload-signature` → Cloudinary direct or local dev). The client keeps a
static copy of the default content and renders it if this endpoint fails, so the
home page never renders blank.

---

## Payments (Razorpay, test mode)

Orders carry `paymentStatus: 'PENDING' | 'PAID' | 'FAILED'` (distinct from the
fulfillment `status`). See `PAYMENTS.md` for the runbook. The gateway runs in a
mock mode when `RAZORPAY_*` is unset — same signature paths, no account needed.

| Endpoint | Auth | Body | Success | Notes |
|----------|------|------|---------|-------|
| `POST /orders/:id/pay-init` | user | — | `200 { razorpayOrderId, keyId, amount, currency, mode }` | creates a gateway order (`amount = total×100` paise, INR); stores `razorpayOrderId` |
| `POST /orders/verify` | user | `{ razorpay_order_id, razorpay_payment_id, razorpay_signature }` | `200 Order` | HMAC-SHA256(`order_id\|payment_id`, key_secret) via timingSafeEqual → marks PAID (idempotent); `400` on mismatch |
| `GET /orders/:id` | user | — | `200 Order` | reflects the server-verified payment state |
| `POST /webhooks/razorpay` | signature | raw body | `200 { received: true }` | **source of truth**; HMAC-SHA256(raw_body, webhook_secret) vs `x-razorpay-signature`; handles `payment.captured`/`payment.failed` idempotently; `400` on bad signature. Mounted with `express.raw` **before** `express.json`. |

## Shipping (Shiprocket, two-way)

Prepaid only (no COD). An order ships only after `paymentStatus = PAID`. The
provider runs in **mock mode** when `SHIPROCKET_*` is unset — same handler paths,
no account needed. See `SHIPROCKET.md`.

| Endpoint | Auth | Body | Success | Notes |
|----------|------|------|---------|-------|
| `POST /admin/orders/:id/ship` | admin | — | `201 Order` (`200` if already shipped) | guards PAID (`409` otherwise); creates the shipment, persists `awb`/`courier`/`labelUrl`/`trackingUrl`, sets `shippingStatus='shipment_created'` + `status='shipped'`, emits `order.shipped`. Idempotent — no duplicate shipment. |
| `POST /webhooks/shiprocket` | `x-api-key` token | raw body `{ awb, current_status }` | `200 { received: true }` | **source of truth** for delivery; maps Shiprocket status → `shippingStatus` idempotently + monotonically; emits `order.delivered` on the transition into delivered. `401` on bad/missing token. Mounted with `express.raw` **before** `express.json`. |

**Order lifecycle events** (internal pub/sub): `order.placed` (on create),
`order.paid` (verify + webhook, once), `order.shipped` (admin ships / status
transition), `order.delivered` (tracking webhook / status transition),
`order.cancelled` (status transition).

These are **server-internal side effects — they do not change any request/response
shape**. Email subscribes (Phase 7): `order.paid` → order-confirmation, `order.shipped`
→ shipping email (idempotent per `(orderId, type)`; dev fallback renders to
`server/.mail/` — see `RESEND.md`). Shipping subscribes (Phase 8) via the ship route
and the tracking webhook above.

---

## Admin endpoints

All under `/admin/*`, requiring a valid access token **and** the `ADMIN` role
(401 unauthenticated, 403 for non-admins). Also `PATCH /admin/site/home` (above).

| Endpoint | Body | Success | Notes |
|----------|------|---------|-------|
| `GET /admin/orders` | — | `200 OrderListResponse` | every order across all customers |
| `GET /admin/stats` | — | `200 AdminStats` | real dashboard aggregates (see below); revenue counts **PAID** orders only |
| `PATCH /admin/orders/:id/status` | `{ status }` | `200 Order` | validates transitions (processing→shipped→delivered, →cancelled; terminal states → `422`) |
| `GET /admin/products/:id` | — | `200 AdminProduct` | full editable shape: variant matrix + raw image `url`/`publicId` |
| `POST /admin/products` | `ProductInput` | `201 ApiProduct` | |
| `PATCH /admin/products/:id` | `Partial<ProductInput>` | `200 ApiProduct` | replaces variants/images when provided |
| `DELETE /admin/products/:id` | — | `200 { ok }` | also deletes each image from the image store |
| `POST /admin/products/bulk-delete` | `{ ids }` | `200 { ok, count }` | |
| `PATCH /admin/products/bulk-status` | `{ ids, status }` | `200 { ok, count }` | |
| `GET /admin/upload-signature` | — | `200 UploadAuthorization` | Cloudinary signed params, or the local dev upload target |
| `POST /admin/upload-dev` | multipart `file` | `201 { url, publicId }` | **local image store only** (Cloudinary uploads go direct from the browser) |

```ts
interface ProductInput {
  name: string; price: number; description: string; category: string;
  variant?: string; sku?: string;
  badge?: 'new' | 'limited' | 'sold-out' | null;
  status?: 'active' | 'draft' | 'out-of-stock' | null;
  stock?: number;
  colors: { id: string; name: string; hex: string }[];
  sizes: string[];
  variants: { colorId: string; size: string; stock: number }[]; // the colour×size matrix
  images: { url: string; publicId?: string | null; alt?: string }[]; // [0] is primary
}

interface AdminStats {
  revenue: number;        // sum of `total` for PAID orders (whole INR rupees)
  orders: number;         // count of all orders
  paidOrders: number;     // count of PAID orders
  customers: number;      // count of users with role CUSTOMER
  avgOrderValue: number;  // revenue / paidOrders (0 when no paid orders)
  products: number;       // count of products
  lowStock: number;       // variants with 0 < stock <= 5
  outOfStock: number;     // variants with stock === 0
  reviews: number;        // count of reviews
  salesByMonth: { month: string; revenue: number }[]; // last 6 months, oldest first
}
```

**Image store.** `GET /admin/upload-signature` returns how to upload for the
active store. With `CLOUDINARY_*` configured it returns signed params
(`{ mode:'cloudinary', cloudName, apiKey, timestamp, signature, folder }`) and
the browser uploads directly to Cloudinary; otherwise it returns
`{ mode:'local', uploadUrl:'/admin/upload-dev' }`. Either way the client ends
with `{ url, publicId }`, which is stored on the product and paired for deletion.
Cloudinary delivery URLs are optimized (`f_auto,q_auto`) by the mapper.

---

## Error model (summary)

| Status | Body                              | When |
|--------|-----------------------------------|------|
| `400`  | `{ "message": "Validation failed", "issues": [...] }` | Invalid request body/params (Zod) |
| `404`  | `{ "message": "Product not found" }` | `GET /products/:idOrSlug` (or `POST /wishlist`) with no match |
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
