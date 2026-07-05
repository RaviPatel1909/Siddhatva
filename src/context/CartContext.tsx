import React, { createContext, useContext, useMemo, useState } from 'react';
import { Product, Color } from '../types/product';
import { getProductById } from '../data/products';

export interface CartLineItem {
  id: string;
  product: Product;
  color: Color;
  size: string;
  quantity: number;
}

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
  const [items, setItems] = useState<CartLineItem[]>(initialItems);

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
