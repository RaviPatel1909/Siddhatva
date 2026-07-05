import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Product, Color } from '../types/product';
import { getProductById } from '../data/products';
import { loadPersisted, savePersisted } from '../lib/persist';

export interface CartLineItem {
  id: string;
  product: Product;
  color: Color;
  size: string;
  quantity: number;
}

const CART_KEY = 'cart';
const CART_VERSION = 1;

// Persist only IDs + variant selection; rehydrate products from the catalog so
// storage stays small and can't hold a stale product snapshot.
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

const initialItems = (): CartLineItem[] => {
  const blazer = getProductById('11')!;
  const shirt = getProductById('6')!;
  return [
    { id: 'seed-1', product: blazer, color: blazer.colors[0], size: '48', quantity: 1 },
    { id: 'seed-2', product: shirt, color: shirt.colors[0], size: 'M', quantity: 1 },
  ];
};

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartLineItem[]>(() => {
    const persisted = loadPersisted<PersistedCartItem[] | null>(CART_KEY, CART_VERSION, null);
    return persisted ? deserializeCart(persisted) : initialItems();
  });

  useEffect(() => {
    savePersisted(CART_KEY, CART_VERSION, serializeCart(items));
  }, [items]);

  const addItem = (product: Product, color: Color, size: string, quantity: number = 1) => {
    setItems((prev) => {
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
  };

  const removeItem = (lineId: string) => {
    setItems((prev) => prev.filter((item) => item.id !== lineId));
  };

  const updateQuantity = (lineId: string, quantity: number) => {
    setItems((prev) =>
      prev.map((item) => (item.id === lineId ? { ...item, quantity: Math.max(1, quantity) } : item))
    );
  };

  const clearCart = () => setItems([]);

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
