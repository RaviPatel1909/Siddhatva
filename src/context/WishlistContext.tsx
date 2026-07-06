import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Product } from '../types/product';
import { getProductById } from '../data/products';
import { loadPersisted, savePersisted } from '../lib/persist';
import { addToWishlist, getWishlist, removeFromWishlist } from '../api/wishlist';
import { useAuth } from './AuthContext';

const WISHLIST_KEY = 'wishlist';
const WISHLIST_VERSION = 1;

interface WishlistContextValue {
  items: Product[];
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  toggle: (product: Product) => void;
  isInWishlist: (productId: string) => boolean;
  clear: () => void;
  count: number;
}

const WishlistContext = createContext<WishlistContextValue | undefined>(undefined);

const loadGuestIds = (): string[] =>
  loadPersisted<string[] | null>(WISHLIST_KEY, WISHLIST_VERSION, null) ?? [];
const loadGuestItems = (): Product[] =>
  loadGuestIds()
    .map((id) => getProductById(id))
    .filter((p): p is Product => Boolean(p));

export const WishlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [items, setItems] = useState<Product[]>(() => loadGuestItems());
  const syncedUser = useRef<string | null>(null);

  // Persist only for guests; a logged-in user's list lives on the server and
  // must not leak into the shared guest store.
  useEffect(() => {
    if (!user) savePersisted(WISHLIST_KEY, WISHLIST_VERSION, items.map((p) => p.id));
  }, [items, user]);

  // React to auth changes: on login, MERGE the guest wishlist into the account
  // (union by product), then treat the server as the source of truth. On logout,
  // fall back to the (now empty-ish) guest store.
  useEffect(() => {
    let active = true;
    if (!user) {
      syncedUser.current = null;
      setItems(loadGuestItems());
      return;
    }
    if (syncedUser.current === user.id) return;
    (async () => {
      const guestIds = loadGuestIds();
      try {
        for (const id of guestIds) {
          await addToWishlist(id).catch(() => undefined);
        }
        const res = await getWishlist();
        if (!active) return;
        setItems(res.items);
        savePersisted(WISHLIST_KEY, WISHLIST_VERSION, []); // guest list merged in
        syncedUser.current = user.id;
      } catch {
        /* server unreachable — keep current items */
      }
    })();
    return () => {
      active = false;
    };
  }, [user]);

  const addItem = (product: Product) => {
    setItems((prev) => (prev.some((p) => p.id === product.id) ? prev : [...prev, product]));
    if (user) addToWishlist(product.id).then((r) => setItems(r.items)).catch(() => undefined);
  };

  const removeItem = (productId: string) => {
    setItems((prev) => prev.filter((p) => p.id !== productId));
    if (user) removeFromWishlist(productId).then((r) => setItems(r.items)).catch(() => undefined);
  };

  const toggle = (product: Product) => {
    if (items.some((p) => p.id === product.id)) removeItem(product.id);
    else addItem(product);
  };

  const isInWishlist = (productId: string) => items.some((p) => p.id === productId);

  const clear = () => setItems([]);

  const count = useMemo(() => items.length, [items]);

  return (
    <WishlistContext.Provider
      value={{ items, addItem, removeItem, toggle, isInWishlist, clear, count }}
    >
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = (): WishlistContextValue => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};
