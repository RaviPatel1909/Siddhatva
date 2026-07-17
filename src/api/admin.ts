import { apiFetch } from './client';
import { getAccessToken } from './auth-token';
import { ApiOrder, ApiProduct, OrderListResponse } from './types';

const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

// Real dashboard aggregates (mirrors server/src/contract.ts AdminStats).
// Money is whole INR rupees; revenue counts PAID orders only.
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

// Grouped results for the admin topbar search (mirrors server/src/contract.ts
// AdminSearchResults). Each item is minimal — a dropdown row plus the id to
// navigate. Each group holds at most 5 rows.
export interface AdminSearchResults {
  products: { id: string; name: string; sublabel: string }[];
  orders: { id: string; label: string; sublabel: string }[];
  customers: { id: string; name: string; email: string }[];
}

// GET /admin/orders — every order across all customers (ADMIN only).
export const getAdminOrders = (): Promise<OrderListResponse> =>
  apiFetch<OrderListResponse>('/admin/orders');

// GET /admin/stats — dashboard KPIs (ADMIN only).
export const getAdminStats = (): Promise<AdminStats> => apiFetch<AdminStats>('/admin/stats');

// GET /admin/search?q= — grouped typeahead across products/orders/customers
// (ADMIN only). q < 2 chars returns empty groups without a DB query, server-side.
export const searchAdmin = (q: string): Promise<AdminSearchResults> =>
  apiFetch<AdminSearchResults>(`/admin/search?q=${encodeURIComponent(q)}`);

// --- Customers (mirrors server/src/contract.ts) ---
// orderCount = all of the customer's orders; totalSpent = their PAID orders' total
// (whole INR rupees); createdAt = ISO 8601.
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
export interface AdminCustomerDetail extends AdminCustomerListItem {
  orders: ApiOrder[];
}

// GET /admin/customers?page=&q= — paginated customer list (ADMIN only).
export const getCustomers = (page = 1, q = ''): Promise<AdminCustomerListResponse> => {
  const params = new URLSearchParams({ page: String(page) });
  if (q) params.set('q', q);
  return apiFetch<AdminCustomerListResponse>(`/admin/customers?${params.toString()}`);
};

// GET /admin/customers/:id — one customer + their orders (ADMIN only).
export const getCustomer = (id: string): Promise<AdminCustomerDetail> =>
  apiFetch<AdminCustomerDetail>(`/admin/customers/${id}`);

// --- Analytics (/admin/analytics/*) — mirrors server/src/contract.ts ---
// Money is whole INR rupees; revenue + product units/revenue count PAID orders
// only. Time buckets + from/to boundaries resolve against IST (UTC+05:30) days;
// from/to are 'YYYY-MM-DD', both inclusive. No UI consumes these yet — they exist
// so the next phase can build the Analytics Dashboard with zero backend changes.
export type AnalyticsGranularity = 'day' | 'week' | 'month';

export interface AnalyticsOverview {
  revenue: number;
  orders: number;
  paidOrders: number;
  customers: number;
  averageOrderValue: number;
  lowStock: number; // current-state, never date-filtered
  outOfStock: number; // current-state, never date-filtered
  reviews: number;
}
export interface RevenuePoint {
  date: string;
  revenue: number;
  orders: number;
}
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
export interface TopProduct {
  productId: string;
  productName: string;
  unitsSold: number;
  revenue: number;
  orderCount: number;
}
export interface AnalyticsCustomers {
  newCustomers: number;
  returningCustomers: number;
  registrationsOverTime: { date: string; count: number }[];
}

export interface AnalyticsRange {
  from?: string;
  to?: string;
}
export interface AnalyticsTimeSeriesParams extends AnalyticsRange {
  granularity?: AnalyticsGranularity;
}

const analyticsQuery = (params: Record<string, string | number | undefined>): string => {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') usp.set(k, String(v));
  }
  const qs = usp.toString();
  return qs ? `?${qs}` : '';
};

// GET /admin/analytics/overview — headline metrics (ADMIN only).
export const getAnalyticsOverview = (params: AnalyticsRange = {}): Promise<AnalyticsOverview> =>
  apiFetch<AnalyticsOverview>(`/admin/analytics/overview${analyticsQuery({ ...params })}`);

// GET /admin/analytics/revenue — PAID revenue per time bucket (ADMIN only).
export const getAnalyticsRevenue = (
  params: AnalyticsTimeSeriesParams = {}
): Promise<RevenuePoint[]> =>
  apiFetch<RevenuePoint[]>(`/admin/analytics/revenue${analyticsQuery({ ...params })}`);

// GET /admin/analytics/orders — counts by the three status axes (ADMIN only).
export const getAnalyticsOrders = (params: AnalyticsRange = {}): Promise<AnalyticsOrders> =>
  apiFetch<AnalyticsOrders>(`/admin/analytics/orders${analyticsQuery({ ...params })}`);

// GET /admin/analytics/products — top products by units, PAID only (ADMIN only).
export const getAnalyticsProducts = (limit?: number): Promise<TopProduct[]> =>
  apiFetch<TopProduct[]>(`/admin/analytics/products${analyticsQuery({ limit })}`);

// GET /admin/analytics/customers — new/returning buyers + registrations (ADMIN only).
export const getAnalyticsCustomers = (
  params: AnalyticsTimeSeriesParams = {}
): Promise<AnalyticsCustomers> =>
  apiFetch<AnalyticsCustomers>(`/admin/analytics/customers${analyticsQuery({ ...params })}`);

// --- Order status ---
export type OrderStatus = 'processing' | 'shipped' | 'delivered' | 'cancelled';
export const updateOrderStatus = (id: string, status: OrderStatus): Promise<ApiOrder> =>
  apiFetch<ApiOrder>(`/admin/orders/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });

// --- Shipping ---
// POST /admin/orders/:id/ship — create the shipment for a PAID order (idempotent).
export const shipOrder = (id: string): Promise<ApiOrder> =>
  apiFetch<ApiOrder>(`/admin/orders/${id}/ship`, { method: 'POST' });

// --- Image upload ---
interface UploadAuthorization {
  mode: 'cloudinary' | 'local';
  cloudName?: string;
  apiKey?: string;
  timestamp?: number;
  signature?: string;
  folder?: string;
  uploadUrl?: string;
}
export interface UploadedImage {
  url: string;
  publicId: string;
}

function xhrPost(
  url: string,
  form: FormData,
  headers: Record<string, string>,
  withCredentials: boolean,
  onProgress?: (pct: number) => void
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.withCredentials = withCredentials;
    Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v));
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch {
          reject(new Error('Bad upload response'));
        }
      } else {
        reject(new Error(`Upload failed (${xhr.status})`));
      }
    };
    xhr.onerror = () => reject(new Error('Upload failed'));
    xhr.send(form);
  });
}

// Upload an image via the active store: Cloudinary (signed, direct from the
// browser) or the local dev endpoint. Returns { url, publicId } either way.
export async function uploadImage(
  file: File,
  onProgress?: (pct: number) => void
): Promise<UploadedImage> {
  const auth = await apiFetch<UploadAuthorization>('/admin/upload-signature');

  if (auth.mode === 'cloudinary') {
    const form = new FormData();
    form.append('file', file);
    form.append('api_key', auth.apiKey ?? '');
    form.append('timestamp', String(auth.timestamp ?? ''));
    form.append('signature', auth.signature ?? '');
    form.append('folder', auth.folder ?? '');
    const data = (await xhrPost(
      `https://api.cloudinary.com/v1_1/${auth.cloudName}/image/upload`,
      form,
      {},
      false,
      onProgress
    )) as { secure_url: string; public_id: string };
    return { url: data.secure_url, publicId: data.public_id };
  }

  // Local dev store: POST to the admin-gated endpoint with the access token.
  const form = new FormData();
  form.append('file', file);
  const token = getAccessToken();
  const data = (await xhrPost(
    `${API_BASE}${auth.uploadUrl}`,
    form,
    token ? { Authorization: `Bearer ${token}` } : {},
    true,
    onProgress
  )) as UploadedImage;
  return data;
}

// --- Product CRUD ---
export interface ProductColorInput {
  id: string;
  name: string;
  hex: string;
}
export interface ProductVariantInput {
  colorId: string;
  size: string;
  stock: number;
}
export interface ProductImageInput {
  url: string;
  publicId?: string | null;
  alt?: string;
}
export interface ProductInput {
  name: string;
  price: number;
  description: string;
  category: string;
  variant?: string;
  sku?: string;
  badge?: 'new' | 'limited' | 'sold-out' | null;
  status?: 'active' | 'draft' | 'out-of-stock' | null;
  stock?: number;
  colors: ProductColorInput[];
  sizes: string[];
  variants: ProductVariantInput[];
  images: ProductImageInput[];
}

// Full editable product (variant matrix + raw image url/publicId).
export interface AdminProduct {
  id: string;
  name: string;
  price: number;
  description: string;
  category: string;
  variant?: string;
  sku?: string;
  badge?: 'new' | 'limited' | 'sold-out';
  status?: 'active' | 'draft' | 'out-of-stock';
  stock?: number;
  colors: ProductColorInput[];
  sizes: string[];
  variants: ProductVariantInput[];
  images: { url: string; publicId: string | null; alt: string }[];
}

export const getAdminProduct = (id: string): Promise<AdminProduct> =>
  apiFetch<AdminProduct>(`/admin/products/${id}`);

const jsonInit = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

export const createProduct = (body: ProductInput): Promise<ApiProduct> =>
  apiFetch<ApiProduct>('/admin/products', jsonInit('POST', body));

export const updateProduct = (id: string, body: Partial<ProductInput>): Promise<ApiProduct> =>
  apiFetch<ApiProduct>(`/admin/products/${id}`, jsonInit('PATCH', body));

export const deleteProduct = (id: string): Promise<{ ok: boolean }> =>
  apiFetch<{ ok: boolean }>(`/admin/products/${id}`, { method: 'DELETE' });

export const bulkDeleteProducts = (ids: string[]): Promise<{ ok: boolean; count: number }> =>
  apiFetch<{ ok: boolean; count: number }>('/admin/products/bulk-delete', jsonInit('POST', { ids }));

export const bulkStatusProducts = (
  ids: string[],
  status: 'active' | 'draft' | 'out-of-stock'
): Promise<{ ok: boolean; count: number }> =>
  apiFetch<{ ok: boolean; count: number }>(
    '/admin/products/bulk-status',
    jsonInit('PATCH', { ids, status })
  );
