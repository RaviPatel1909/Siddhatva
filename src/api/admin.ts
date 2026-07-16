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
