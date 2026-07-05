import { apiFetch } from './client';
import { OrderListResponse } from './types';

// GET /orders — the signed-in customer's orders, newest first.
export function getOrders(): Promise<OrderListResponse> {
  return apiFetch<OrderListResponse>('/orders');
}
