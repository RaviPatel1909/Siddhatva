import React, { createContext, useContext, useEffect, useState } from 'react';
import { Order } from '../types/order';
import { CartLineItem } from './CartContext';
import { createOrder, getOrders } from '../api/orders';
import { useAuth } from './AuthContext';

export interface PlaceOrderInput {
  items: CartLineItem[];
  totals: { subtotal: number; shipping: number; tax: number; total: number };
  customerName: string;
  shippingAddress: Order['shippingAddress'];
}

interface OrdersContextValue {
  orders: Order[];
  placeOrder: (input: PlaceOrderInput) => Promise<Order>;
  getOrderById: (id: string) => Order | undefined;
}

const OrdersContext = createContext<OrdersContextValue | undefined>(undefined);

// Orders are per-user server data. This context is a small client cache of the
// authenticated user's orders (for AccountOverview / OrderConfirmed); My Orders
// reads the same data via its own query.
export const OrdersProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    if (!user) {
      setOrders([]);
      return;
    }
    let active = true;
    getOrders()
      .then((res) => active && setOrders(res.items))
      .catch(() => active && setOrders([]));
    return () => {
      active = false;
    };
  }, [user]);

  const placeOrder = async (input: PlaceOrderInput): Promise<Order> => {
    const created = await createOrder({
      id: `SID-${Math.floor(10000 + Math.random() * 89999)}`,
      date: new Date().toISOString().slice(0, 10),
      customerName: input.customerName,
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
    });
    setOrders((prev) => [created, ...prev]);
    return created;
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
