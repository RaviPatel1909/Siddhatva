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
