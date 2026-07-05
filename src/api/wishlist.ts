import { apiFetch } from './client';
import { WishlistResponse } from './types';

// GET /wishlist — the customer's saved products. Part of the contract; the app
// currently keeps wishlist selection in client state (WishlistContext).
export function getWishlist(): Promise<WishlistResponse> {
  return apiFetch<WishlistResponse>('/wishlist');
}
