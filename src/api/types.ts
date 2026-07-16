// ============================================================================
// API CONTRACT
// These request/response types are the contract the future Express server must
// implement verbatim. The MSW mock (src/mocks) serves exactly these shapes.
// ============================================================================
import { Product } from '../types/product';
import { Order, OrderItem } from '../types/order';

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

// POST /orders request body. Status is assigned server-side.
export interface CreateOrderInput {
  id?: string;
  date?: string;
  customerName: string;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  shippingAddress: Order['shippingAddress'];
}

export interface WishlistResponse {
  items: ApiProduct[];
}

export interface ApiErrorBody {
  message: string;
}
