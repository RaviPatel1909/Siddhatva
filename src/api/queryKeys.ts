import { ProductListParams } from './types';

// Central query-key factory so invalidation stays consistent across the app.
export const queryKeys = {
  products: (params: ProductListParams = {}) => ['products', params] as const,
  product: (idOrSlug: string) => ['product', idOrSlug] as const,
  orders: () => ['orders'] as const,
  wishlist: () => ['wishlist'] as const,
};
