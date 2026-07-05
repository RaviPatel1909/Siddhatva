import { Order } from '../types/order';
import { getProductById } from './products';

const lineItem = (productId: string, variant: string, quantity: number) => {
  const product = getProductById(productId)!;
  return {
    productId,
    name: product.name,
    image: product.images[0].src,
    variant,
    quantity,
    price: product.price,
  };
};

export const orders: Order[] = [
  {
    id: 'SID-98231',
    customerName: 'Alexander Sterling',
    date: '2023-10-24',
    status: 'delivered',
    items: [lineItem('6', 'Champagne / Size M', 1)],
    subtotal: 420,
    shipping: 0,
    tax: 33.6,
    total: 453.6,
    shippingAddress: {
      name: 'Alexander Sterling',
      line1: '24 Bronze Lane',
      city: 'London',
      state: '',
      zip: 'W1K 5QT',
      country: 'United Kingdom',
    },
  },
  {
    id: 'ORD-8241',
    customerName: 'Eleanor Martini',
    date: '2023-10-24',
    status: 'delivered',
    items: [lineItem('1', 'Champagne / Size S', 1)],
    subtotal: 1200,
    shipping: 0,
    tax: 50,
    total: 1250,
    shippingAddress: {
      name: 'Eleanor Martini',
      line1: '8 Via Roma',
      city: 'Milan',
      state: '',
      zip: '20121',
      country: 'Italy',
    },
  },
  {
    id: 'ORD-8242',
    customerName: 'Julian Sterling',
    date: '2023-10-24',
    status: 'shipped',
    items: [lineItem('10', 'Cognac', 1), lineItem('7', 'Burnished Bronze / 42', 1)],
    subtotal: 2250,
    shipping: 0,
    tax: 180,
    total: 2430,
    shippingAddress: {
      name: 'Julian Sterling',
      line1: '410 Fifth Avenue',
      city: 'New York',
      state: 'NY',
      zip: '10018',
      country: 'United States',
    },
  },
  {
    id: 'ORD-8243',
    customerName: 'Aurelia Blanche',
    date: '2023-10-23',
    status: 'processing',
    items: [lineItem('4', 'Petal Blush / Size S', 1)],
    subtotal: 520,
    shipping: 15,
    tax: 41.6,
    total: 576.6,
    shippingAddress: {
      name: 'Aurelia Blanche',
      line1: '12 Rue de Rivoli',
      city: 'Paris',
      state: '',
      zip: '75004',
      country: 'France',
    },
  },
  {
    id: 'ORD-8244',
    customerName: 'Luca Valente',
    date: '2023-10-23',
    status: 'delivered',
    items: [lineItem('9', 'Gold Vermeil', 1), lineItem('8', 'Oat', 1)],
    subtotal: 1425,
    shipping: 0,
    tax: 114,
    total: 1539,
    shippingAddress: {
      name: 'Luca Valente',
      line1: '3 Piazza del Duomo',
      city: 'Florence',
      state: '',
      zip: '50122',
      country: 'Italy',
    },
  },
  {
    id: 'ORD-8245',
    customerName: 'Alexander Sterling',
    date: '2023-09-30',
    status: 'cancelled',
    items: [lineItem('12', 'Midnight Black / Size L', 1)],
    subtotal: 550,
    shipping: 0,
    tax: 44,
    total: 594,
    shippingAddress: {
      name: 'Alexander Sterling',
      line1: '24 Bronze Lane',
      city: 'London',
      state: '',
      zip: 'W1K 5QT',
      country: 'United Kingdom',
    },
  },
];

export const getOrderById = (id: string): Order | undefined =>
  orders.find((order) => order.id === id);
