export type OrderStatus = 'processing' | 'shipped' | 'delivered' | 'cancelled';
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED';
export type ShippingStatus =
  | 'not_shipped'
  | 'shipment_created'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export interface OrderItem {
  productId: string;
  name: string;
  image: string;
  variant: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  customerName: string;
  date: string;
  status: OrderStatus;
  paymentStatus?: PaymentStatus;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  shippingAddress: {
    name: string;
    line1: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  // Shipping/tracking (Phase 8). Server always sends shippingStatus; the rest
  // appear once a shipment exists. Optional here since client-built orders
  // (pre-persist) don't carry them.
  shippingStatus?: ShippingStatus;
  awb?: string;
  courier?: string;
  trackingUrl?: string;
  labelUrl?: string;
}
