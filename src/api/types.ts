// ============================================================================
// API CONTRACT
// These request/response types are the contract the future Express server must
// implement verbatim. The MSW mock (src/mocks) serves exactly these shapes.
// ============================================================================
import { Product } from '../types/product';
import { Order } from '../types/order';

// A catalog product as returned by the API — the domain Product plus a URL slug.
export type ApiProduct = Product & { slug: string };

export type ProductSortOption = 'featured' | 'price-asc' | 'price-desc';

export interface ProductListParams {
  q?: string;
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

export type ApiOrder = Order;

export interface OrderListResponse {
  items: ApiOrder[];
  total: number;
}

// POST /orders request line — product identity, the variant to buy, and how many.
// No monetary fields: the server derives every price/total from the database (see
// docs/API_CONTRACT.md). colorId + size select the variant for pricing and stock.
export interface CreateOrderItemInput {
  productId: string;
  colorId: string;
  size: string;
  quantity: number;
}

// POST /orders request body. id/date/status and ALL money are assigned/computed
// server-side; the client sends only identity, quantities, and the address.
export interface CreateOrderInput {
  customerName: string;
  items: CreateOrderItemInput[];
  shippingAddress: Order['shippingAddress'];
}

export interface WishlistResponse {
  items: ApiProduct[];
}

export interface ApiErrorBody {
  message: string;
}
