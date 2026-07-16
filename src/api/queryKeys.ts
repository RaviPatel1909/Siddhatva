import { ProductListParams } from './types';

// Central query-key factory so invalidation stays consistent across the app.
export const queryKeys = {
  products: (params: ProductListParams = {}) => ['products', params] as const,
  product: (idOrSlug: string) => ['product', idOrSlug] as const,
  orders: () => ['orders'] as const,
  wishlist: () => ['wishlist'] as const,
  adminSearch: (q: string) => ['admin', 'search', q] as const,
  adminCustomers: (page: number, q: string) => ['admin', 'customers', page, q] as const,
  adminCustomer: (id: string) => ['admin', 'customer', id] as const,
};
