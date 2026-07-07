import { Order, OrderStatus } from '../types/order';
import { getProductById } from './products';

const TAX_RATE = 0.08;

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

// Derive money from the line items so seed orders stay consistent with product
// prices (INR, whole rupees) — no hand-kept subtotals to drift. Tax is rounded so
// totals stay integer (which keeps displayed == charged, per src/lib/money.ts).
type OrderSeed = Omit<Order, 'subtotal' | 'tax' | 'total' | 'shipping'> & { shipping?: number };
const makeOrder = (o: OrderSeed): Order => {
  const subtotal = o.items.reduce((sum, it) => sum + it.price * it.quantity, 0);
  const shipping = o.shipping ?? 0;
  const tax = Math.round(subtotal * TAX_RATE);
  return { ...o, subtotal, shipping, tax, total: subtotal + shipping + tax };
};

const order = (
  id: string,
  customerName: string,
  date: string,
  status: OrderStatus,
  items: Order['items'],
  shippingAddress: Order['shippingAddress'],
  shipping = 0
): Order => makeOrder({ id, customerName, date, status, items, shippingAddress, shipping });

export const orders: Order[] = [
  order('SID-98231', 'Alexander Sterling', '2023-10-24', 'delivered',
    [lineItem('6', 'Champagne / Size M', 1)],
    { name: 'Alexander Sterling', line1: '24 Bronze Lane', city: 'London', state: '', zip: 'W1K 5QT', country: 'United Kingdom' }),
  order('ORD-8241', 'Eleanor Martini', '2023-10-24', 'delivered',
    [lineItem('1', 'Champagne / Size S', 1)],
    { name: 'Eleanor Martini', line1: '8 Via Roma', city: 'Milan', state: '', zip: '20121', country: 'Italy' }),
  order('ORD-8242', 'Julian Sterling', '2023-10-24', 'shipped',
    [lineItem('10', 'Cognac', 1), lineItem('7', 'Burnished Bronze / 42', 1)],
    { name: 'Julian Sterling', line1: '410 Fifth Avenue', city: 'New York', state: 'NY', zip: '10018', country: 'United States' }),
  order('ORD-8243', 'Aurelia Blanche', '2023-10-23', 'processing',
    [lineItem('4', 'Petal Blush / Size S', 1)],
    { name: 'Aurelia Blanche', line1: '12 Rue de Rivoli', city: 'Paris', state: '', zip: '75004', country: 'France' }),
  order('ORD-8244', 'Luca Valente', '2023-10-23', 'delivered',
    [lineItem('9', 'Gold Vermeil', 1), lineItem('8', 'Oat', 1)],
    { name: 'Luca Valente', line1: '3 Piazza del Duomo', city: 'Florence', state: '', zip: '50122', country: 'Italy' }),
  order('ORD-8245', 'Alexander Sterling', '2023-09-30', 'cancelled',
    [lineItem('12', 'Midnight Black / Size L', 1)],
    { name: 'Alexander Sterling', line1: '24 Bronze Lane', city: 'London', state: '', zip: 'W1K 5QT', country: 'United Kingdom' }),
];

export const getOrderById = (id: string): Order | undefined =>
  orders.find((order) => order.id === id);
