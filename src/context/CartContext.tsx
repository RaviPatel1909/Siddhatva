import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Product, Color } from '../types/product';
import { getProductById } from '../data/products';
import { loadPersisted, savePersisted } from '../lib/persist';
import { useAuth } from './AuthContext';

export interface CartLineItem {
  id: string;
  product: Product;
  color: Color;
  size: string;
  quantity: number;
}

const CART_KEY = 'cart';
const CART_VERSION = 1;

// Cart is client-side (no server cart in this system) but namespaced per identity
// so accounts keep separate carts; the guest cart is unioned in on login.
const guestKey = CART_KEY;
const userKey = (id: string) => `${CART_KEY}:${id}`;
const keyFor = (userId: string | null) => (userId ? userKey(userId) : guestKey);

type PersistedCartItem = { id: string; productId: string; colorId: string; size: string; quantity: number };

const serializeCart = (items: CartLineItem[]): PersistedCartItem[] =>
  items.map((i) => ({ id: i.id, productId: i.product.id, colorId: i.color.id, size: i.size, quantity: i.quantity }));

const deserializeCart = (persisted: PersistedCartItem[]): CartLineItem[] =>
  persisted.flatMap((p) => {
    const product = getProductById(p.productId);
    if (!product) return [];
    const color = product.colors.find((c) => c.id === p.colorId) ?? product.colors[0];
    return [{ id: p.id, product, color, size: p.size, quantity: Math.max(1, p.quantity) }];
  });

const loadCart = (key: string): CartLineItem[] => {
  const persisted = loadPersisted<PersistedCartItem[] | null>(key, CART_VERSION, null);
  return persisted ? deserializeCart(persisted) : [];
};
const saveCart = (key: string, items: CartLineItem[]): void =>
  savePersisted(key, CART_VERSION, serializeCart(items));

const lineKey = (i: CartLineItem) => `${i.product.id}-${i.color.id}-${i.size}`;

// Union two carts by product+colour+size, summing quantities (don't clobber).
const unionCarts = (a: CartLineItem[], b: CartLineItem[]): CartLineItem[] => {
  const map = new Map<string, CartLineItem>();
  for (const item of [...a, ...b]) {
    const k = lineKey(item);
    const existing = map.get(k);
    map.set(k, existing ? { ...existing, quantity: existing.quantity + item.quantity } : { ...item });
  }
  return Array.from(map.values());
};

interface CartContextValue {
  items: CartLineItem[];
  addItem: (product: Product, color: Color, size: string, quantity?: number) => void;
  removeItem: (lineId: string) => void;
  updateQuantity: (lineId: string, quantity: number) => void;
  clearCart: () => void;
  itemCount: number;
  subtotal: number;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [items, setItems] = useState<CartLineItem[]>(() => loadCart(guestKey));
  const keyRef = useRef(guestKey);
  keyRef.current = keyFor(user?.id ?? null);
  const syncedUser = useRef<string | null>(null);

  // On login, union the guest cart into the account's cart; on logout, load the
  // guest cart. Mutations below persist directly, so there's no generic persist
  // effect to race with this transition.
  useEffect(() => {
    const id = user?.id ?? null;
    if (syncedUser.current === id) return;
    if (id) {
      const merged = unionCarts(loadCart(userKey(id)), loadCart(guestKey));
      setItems(merged);
      saveCart(userKey(id), merged);
      saveCart(guestKey, []); // guest cart merged into the account
    } else {
      setItems(loadCart(guestKey));
    }
    syncedUser.current = id;
  }, [user]);

  const commit = (updater: (prev: CartLineItem[]) => CartLineItem[]) =>
    setItems((prev) => {
      const next = updater(prev);
      saveCart(keyRef.current, next);
      return next;
    });

  const addItem = (product: Product, color: Color, size: string, quantity: number = 1) =>
    commit((prev) => {
      const existing = prev.find(
        (item) => item.product.id === product.id && item.color.id === color.id && item.size === size
      );
      if (existing) {
        return prev.map((item) =>
          item.id === existing.id ? { ...item, quantity: item.quantity + quantity } : item
        );
      }
      return [...prev, { id: `${product.id}-${color.id}-${size}-${Date.now()}`, product, color, size, quantity }];
    });

  const removeItem = (lineId: string) => commit((prev) => prev.filter((item) => item.id !== lineId));

  const updateQuantity = (lineId: string, quantity: number) =>
    commit((prev) =>
      prev.map((item) => (item.id === lineId ? { ...item, quantity: Math.max(1, quantity) } : item))
    );

  const clearCart = () => commit(() => []);

  const itemCount = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);
  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
    [items]
  );

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, itemCount, subtotal }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = (): CartContextValue => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
