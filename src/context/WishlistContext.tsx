import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Product } from '../types/product';
import { getProductById } from '../data/products';
import { loadPersisted, savePersisted } from '../lib/persist';

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

const initialItems = (): Product[] =>
  ['7', '8', '9'].map((id) => getProductById(id)).filter((p): p is Product => Boolean(p));

export const WishlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<Product[]>(() => {
    const ids = loadPersisted<string[] | null>(WISHLIST_KEY, WISHLIST_VERSION, null);
    return ids
      ? ids.map((id) => getProductById(id)).filter((p): p is Product => Boolean(p))
      : initialItems();
  });

  useEffect(() => {
    savePersisted(WISHLIST_KEY, WISHLIST_VERSION, items.map((p) => p.id));
  }, [items]);

  const addItem = (product: Product) =>
    setItems((prev) => (prev.some((p) => p.id === product.id) ? prev : [...prev, product]));

  const removeItem = (productId: string) =>
    setItems((prev) => prev.filter((p) => p.id !== productId));

  const toggle = (product: Product) =>
    setItems((prev) =>
      prev.some((p) => p.id === product.id)
        ? prev.filter((p) => p.id !== product.id)
        : [...prev, product]
    );

  const isInWishlist = (productId: string) => items.some((p) => p.id === productId);

  const clear = () => setItems([]);

  const count = useMemo(() => items.length, [items]);

  return (
    <WishlistContext.Provider value={{ items, addItem, removeItem, toggle, isInWishlist, clear, count }}>
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
