// ============================================================================
// API CONTRACT — server side.
// This MUST stay identical to the frontend's src/api/types.ts and
// docs/API_CONTRACT.md. Both sides agree on these wire shapes; the mappers
// (src/lib/mappers.ts) produce exactly these from the DB models.
// ============================================================================

export type ProductBadge = 'new' | 'limited' | 'sold-out';
export type ProductStatus = 'active' | 'draft' | 'out-of-stock';

export interface Color {
  id: string;
  name: string;
  hex: string;
}
export interface ProductImage {
  id: string;
  src: string;
  alt: string;
}

export interface ApiProduct {
  id: string;
  slug: string;
  name: string;
  price: number;
  description: string;
  images: ProductImage[];
  colors: Color[];
  sizes: string[];
  category: string;
  variant?: string;
  badge?: ProductBadge;
  stock?: number;
  sku?: string;
  status?: ProductStatus;
}

export type ProductSortOption = 'featured' | 'price-asc' | 'price-desc';

export interface ProductListParams {
  category?: string;
  color?: string;
  size?: string;
  sort?: ProductSortOption;
  page?: number;
  pageSize?: number;
}

export interface CategoryFacet {
  name: string;
  count: number;
}
export interface ColorFacet {
  id: string;
  name: string;
  hex: string;
}

export interface ProductListResponse {
  items: ApiProduct[];
  total: number;
  page: number;
  pageSize: number;
  facets: {
    categories: CategoryFacet[];
    colors: ColorFacet[];
  };
}

export type OrderStatus = 'processing' | 'shipped' | 'delivered' | 'cancelled';
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED';
// Normalized shipping status, distinct from fulfillment `status` and
// `paymentStatus`. The Shiprocket tracking webhook is its source of truth.
export type ShippingStatus =
  | 'not_shipped'
  | 'shipment_created'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export interface OrderItem {
  productId: string;
  name: string;
  image: string;
  variant: string;
  quantity: number;
  price: number;
}

export interface Address {
  name: string;
  line1: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export interface ApiOrder {
  id: string;
  userId: string; // the customer's User id (FK); always present on persisted orders
  customerName: string;
  date: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  shippingAddress: Address;
  // Shipping/tracking (Phase 8). `shippingStatus` is always present; the rest
  // exist once a shipment has been created. `labelUrl` is for admin (packing).
  shippingStatus: ShippingStatus;
  awb?: string;
  courier?: string;
  trackingUrl?: string;
  labelUrl?: string;
}

export interface OrderListResponse {
  items: ApiOrder[];
  total: number;
}

export interface WishlistResponse {
  items: ApiProduct[];
}

// Admin dashboard aggregates — all computed live from the DB. Money is whole INR
// rupees (revenue = sum of PAID orders only). `salesByMonth` is the last months
// oldest→newest, each { month: 'JAN', revenue } for the paid-revenue chart.
export interface AdminStats {
  revenue: number;
  orders: number;
  paidOrders: number;
  customers: number;
  avgOrderValue: number;
  products: number;
  lowStock: number;
  outOfStock: number;
  reviews: number;
  salesByMonth: { month: string; revenue: number }[];
}

// Grouped results for the admin topbar search. Each item is minimal — just what a
// dropdown row renders plus the `id` needed to navigate. Each group ≤ 5 rows.
export interface AdminSearchResults {
  products: { id: string; name: string; sublabel: string }[]; // sublabel = category name
  orders: { id: string; label: string; sublabel: string }[]; // label = order id; sublabel = `${customerName} · ${status}`
  customers: { id: string; name: string; email: string }[];
}

// Admin customers list. `orderCount` counts ALL of the customer's orders;
// `totalSpent` sums only PAID orders' `total` (whole INR rupees), mirroring how
// AdminStats.revenue is defined. `createdAt` is ISO 8601.
export interface AdminCustomerListItem {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  orderCount: number;
  totalSpent: number;
}

export interface AdminCustomerListResponse {
  items: AdminCustomerListItem[];
  total: number;
  page: number;
  pageSize: number;
}

// One customer plus their orders in the admin Order DTO (reused, not reinvented).
export interface AdminCustomerDetail extends AdminCustomerListItem {
  orders: ApiOrder[];
}

// --- Admin analytics (/admin/analytics/*) ---
// Separate namespace from AdminStats (which stays backward-compatible). Money is
// whole INR rupees; revenue + product units/revenue count PAID orders only. All
// time-series bucket + from/to boundaries resolve against IST (UTC+05:30) days.

// GET /admin/analytics/overview — headline metrics. Revenue/orders/customers/
// reviews respect the date filter; inventory (lowStock/outOfStock) is always
// current-state (never date-filtered).
export interface AnalyticsOverview {
  revenue: number;
  orders: number;
  paidOrders: number;
  customers: number;
  averageOrderValue: number;
  lowStock: number;
  outOfStock: number;
  reviews: number;
}

// GET /admin/analytics/revenue — PAID revenue + paid-order count per bucket,
// oldest→newest, zero-filled across the (default or requested) window.
export interface RevenuePoint {
  date: string; // day 'YYYY-MM-DD' | week Monday 'YYYY-MM-DD' | month 'YYYY-MM'
  revenue: number;
  orders: number;
}

// GET /admin/analytics/orders — counts grouped by THREE independent status axes.
// An order is in exactly one state on each axis simultaneously; the nesting makes
// that explicit rather than implying one flat mutually-exclusive field.
export interface AnalyticsOrders {
  fulfillment: { processing: number; shipped: number; delivered: number; cancelled: number };
  payment: { pendingPayment: number; paid: number; failedPayment: number };
  shipping: {
    notShipped: number;
    shipmentCreated: number;
    inTransit: number;
    outForDelivery: number;
    delivered: number;
    cancelled: number;
  };
}

// GET /admin/analytics/products — top products by units sold (PAID only).
export interface TopProduct {
  productId: string;
  productName: string; // denormalized OrderItem.name (survives product hard-delete)
  unitsSold: number;
  revenue: number;
  orderCount: number;
}

// GET /admin/analytics/customers — new/returning BUYERS over the window (order-
// activity based), plus a separate account-registration series.
export interface AnalyticsCustomers {
  newCustomers: number; // first-ever order falls within the window
  returningCustomers: number; // ordered in window AND has ≥1 order before `from`
  registrationsOverTime: { date: string; count: number }[]; // signups per bucket, zero-filled
}
