import { EventEmitter } from 'node:events';

export type OrderEvent =
  | 'order.placed'
  | 'order.paid'
  | 'order.shipped'
  | 'order.delivered'
  | 'order.cancelled';

export interface OrderEventData {
  orderId: string;
  [key: string]: unknown;
}

// Small internal pub/sub for the order lifecycle. Payment verification + the
// webhook emit order.paid; the admin status transitions emit the rest.
// Subscribers just log for now — Phases 7-9 (email/Resend, WhatsApp, Shiprocket)
// subscribe here instead of scattering side-effect calls through the routes.
class OrderEventBus {
  private readonly emitter = new EventEmitter();
  on(event: OrderEvent, handler: (data: OrderEventData) => void): void {
    this.emitter.on(event, handler);
  }
  emit(event: OrderEvent, data: OrderEventData): void {
    this.emitter.emit(event, data);
  }
}

export const orderEvents = new OrderEventBus();

const ALL_EVENTS: OrderEvent[] = [
  'order.placed',
  'order.paid',
  'order.shipped',
  'order.delivered',
  'order.cancelled',
];
for (const event of ALL_EVENTS) {
  orderEvents.on(event, (data) => {
    // eslint-disable-next-line no-console
    console.log(`[event] ${event} ${JSON.stringify(data)}`);
  });
}
