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

export interface WishlistResponse {
  items: ApiProduct[];
}

export interface ApiErrorBody {
  message: string;
}
