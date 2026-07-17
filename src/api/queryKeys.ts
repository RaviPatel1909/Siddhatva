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
  // Analytics — keyed by the resolved range/granularity so a filter change refetches.
  adminAnalyticsOverview: (from: string, to: string) =>
    ['admin', 'analytics', 'overview', from, to] as const,
  adminAnalyticsRevenue: (from: string, to: string, granularity: string) =>
    ['admin', 'analytics', 'revenue', from, to, granularity] as const,
  adminAnalyticsOrders: (from: string, to: string) =>
    ['admin', 'analytics', 'orders', from, to] as const,
  adminAnalyticsProducts: (limit: number) => ['admin', 'analytics', 'products', limit] as const,
  adminAnalyticsCustomers: (from: string, to: string, granularity: string) =>
    ['admin', 'analytics', 'customers', from, to, granularity] as const,
};
