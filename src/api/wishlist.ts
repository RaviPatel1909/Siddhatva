import { apiFetch } from './client';
import { WishlistResponse } from './types';

// GET /wishlist — the authenticated user's saved products.
export function getWishlist(): Promise<WishlistResponse> {
  return apiFetch<WishlistResponse>('/wishlist');
}

// POST /wishlist { productId } — add a product; returns the updated wishlist.
export function addToWishlist(productId: string): Promise<WishlistResponse> {
  return apiFetch<WishlistResponse>('/wishlist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId }),
  });
}

// DELETE /wishlist/:productId — remove a product; returns the updated wishlist.
export function removeFromWishlist(productId: string): Promise<WishlistResponse> {
  return apiFetch<WishlistResponse>(`/wishlist/${productId}`, { method: 'DELETE' });
}
