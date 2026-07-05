import { apiFetch, buildQuery } from './client';
import { ApiProduct, ProductListParams, ProductListResponse } from './types';

// GET /products?category&color&size&sort&page&pageSize
export function getProducts(params: ProductListParams = {}): Promise<ProductListResponse> {
  return apiFetch<ProductListResponse>(`/products${buildQuery({ ...params })}`);
}

// GET /products/:idOrSlug  — resolvable by product id or slug.
export function getProduct(idOrSlug: string): Promise<ApiProduct> {
  return apiFetch<ApiProduct>(`/products/${encodeURIComponent(idOrSlug)}`);
}
