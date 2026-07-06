import { apiFetch } from './client';
import { OrderListResponse } from './types';

export interface AdminStats {
  totalOrders: number;
  totalRevenue: number;
  totalProducts: number;
  totalCustomers: number;
}

// GET /admin/orders — every order across all customers (ADMIN only).
export const getAdminOrders = (): Promise<OrderListResponse> =>
  apiFetch<OrderListResponse>('/admin/orders');

// GET /admin/stats — dashboard KPIs (ADMIN only).
export const getAdminStats = (): Promise<AdminStats> => apiFetch<AdminStats>('/admin/stats');
