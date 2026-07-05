import { apiFetch } from './client';
import { ApiOrder, CreateOrderInput, OrderListResponse } from './types';

// GET /orders — the signed-in customer's orders, newest first.
export function getOrders(): Promise<OrderListResponse> {
  return apiFetch<OrderListResponse>('/orders');
}

// POST /orders — create an order; returns the created order.
export function createOrder(input: CreateOrderInput): Promise<ApiOrder> {
  return apiFetch<ApiOrder>('/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}
