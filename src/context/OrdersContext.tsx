import React, { createContext, useContext, useEffect, useState } from 'react';
import { Order } from '../types/order';
import { CartLineItem } from './CartContext';
import { createOrder, getOrders } from '../api/orders';
import { useAuth } from './AuthContext';

export interface PlaceOrderInput {
  items: CartLineItem[];
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
    // Send only identity + variant + quantity — the server derives every price
    // and total from the database, so no monetary value is sent from here.
    const created = await createOrder({
      customerName: input.customerName,
      items: input.items.map((line) => ({
        productId: line.product.id,
        colorId: line.color.id,
        size: line.size,
        quantity: line.quantity,
      })),
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
