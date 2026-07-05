import React, { createContext, useContext, useEffect, useState } from 'react';
import { Order } from '../types/order';
import { orders as seedOrders } from '../data/orders';
import { CartLineItem } from './CartContext';
import { loadPersisted, savePersisted } from '../lib/persist';

const ORDERS_KEY = 'orders';
const ORDERS_VERSION = 1;

export interface PlaceOrderInput {
  items: CartLineItem[];
  totals: { subtotal: number; shipping: number; tax: number; total: number };
  customerName: string;
  shippingAddress: Order['shippingAddress'];
}

interface OrdersContextValue {
  orders: Order[];
  placeOrder: (input: PlaceOrderInput) => Order;
  getOrderById: (id: string) => Order | undefined;
}

const OrdersContext = createContext<OrdersContextValue | undefined>(undefined);

// Orders are immutable snapshots of what was purchased, so they're persisted in
// full (not rehydrated from the live catalog).
export const OrdersProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [orders, setOrders] = useState<Order[]>(
    () => loadPersisted<Order[] | null>(ORDERS_KEY, ORDERS_VERSION, null) ?? seedOrders
  );

  useEffect(() => {
    savePersisted(ORDERS_KEY, ORDERS_VERSION, orders);
  }, [orders]);

  const placeOrder = (input: PlaceOrderInput): Order => {
    const order: Order = {
      id: `SID-${Math.floor(10000 + Math.random() * 89999)}`,
      customerName: input.customerName,
      date: new Date().toISOString().slice(0, 10),
      status: 'processing',
      items: input.items.map((line) => ({
        productId: line.product.id,
        name: line.product.name,
        image: line.product.images[0].src,
        variant: `${line.color.name} / ${line.size}`,
        quantity: line.quantity,
        price: line.product.price,
      })),
      subtotal: input.totals.subtotal,
      shipping: input.totals.shipping,
      tax: input.totals.tax,
      total: input.totals.total,
      shippingAddress: input.shippingAddress,
    };
    setOrders((prev) => [order, ...prev]);
    return order;
  };

  const getOrderById = (id: string) => orders.find((o) => o.id === id);

  return (
    <OrdersContext.Provider value={{ orders, placeOrder, getOrderById }}>
      {children}
    </OrdersContext.Provider>
  );
};

export const useOrders = (): OrdersContextValue => {
  const context = useContext(OrdersContext);
  if (!context) {
    throw new Error('useOrders must be used within an OrdersProvider');
  }
  return context;
};
