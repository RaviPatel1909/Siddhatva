import { prisma } from '../prisma';
import { HttpError } from './http';
import { orderEvents } from './events';
import { orderInclude, OrderWithRelations } from './mappers';
import { shippingProvider, ShipmentOrderInput } from './shipping/provider';
import { mapShiprocketStatus, shippingRank } from './shipping/statusMap';
import { ShippingStatus } from '../contract';

function toShipmentInput(order: OrderWithRelations & { user: { email: string } }): ShipmentOrderInput {
  return {
    orderId: order.id,
    customerName: order.customerName,
    email: order.user.email,
    items: order.items.map((it) => ({ name: it.name, quantity: it.quantity, price: it.price })),
    subtotal: order.subtotal,
    total: order.total,
    shippingAddress: {
      name: order.shippingAddress.name,
      line1: order.shippingAddress.line1,
      city: order.shippingAddress.city,
      state: order.shippingAddress.state,
      zip: order.shippingAddress.zip,
      country: order.shippingAddress.country,
    },
  };
}

// Create the shipment for a PAID order. Idempotent: if a shipment already exists
// it's returned as-is (no duplicate creation, no re-emit). On first creation it
// persists AWB/label/tracking, advances fulfillment status to `shipped`, and
// emits order.shipped (which triggers the Phase 7 shipping email).
export async function shipOrder(orderId: string): Promise<{ order: OrderWithRelations; created: boolean }> {
  const existing = await prisma.order.findUnique({
    where: { id: orderId },
    include: { ...orderInclude, user: true },
  });
  if (!existing) throw new HttpError(404, 'Order not found');
  if (existing.paymentStatus !== 'PAID') {
    throw new HttpError(409, 'Order must be paid before it can ship');
  }

  // Already shipped → return the existing shipment (idempotent).
  if (existing.shipmentId) {
    const order = await prisma.order.findUnique({ where: { id: orderId }, include: orderInclude });
    return { order: order!, created: false };
  }

  const shipment = await shippingProvider.createShipment(toShipmentInput(existing));
  await prisma.order.update({
    where: { id: orderId },
    data: {
      shipmentId: shipment.shipmentId,
      awb: shipment.awb,
      courier: shipment.courier,
      labelUrl: shipment.labelUrl,
      trackingUrl: shipment.trackingUrl,
      shippingStatus: 'shipment_created',
      status: 'shipped', // fulfillment follows shipment creation
    },
  });
  orderEvents.emit('order.shipped', { orderId });

  const order = await prisma.order.findUnique({ where: { id: orderId }, include: orderInclude });
  return { order: order!, created: true };
}

// Apply an inbound Shiprocket tracking update (the webhook is the source of
// truth). Idempotent + monotonic: never moves a shipment backwards, and only
// emits order.delivered on the transition INTO delivered.
export async function applyShiprocketTracking(awb: string, rawStatus: string): Promise<void> {
  const next = mapShiprocketStatus(rawStatus);
  if (!next) return; // unrecognized status → no state change (still 200)

  const order = await prisma.order.findFirst({ where: { awb } });
  if (!order) return;

  const current = order.shippingStatus as ShippingStatus;
  if (current === next) return; // duplicate event → no-op

  // Don't regress along the forward path (a late/out-of-order in_transit after
  // delivered shouldn't undo delivery). `cancelled` (rank -1) may always apply.
  if (next !== 'cancelled' && shippingRank(next) <= shippingRank(current)) return;

  const becameDelivered = next === 'delivered' && current !== 'delivered';
  await prisma.order.update({
    where: { id: order.id },
    data: {
      shippingStatus: next,
      // Keep fulfillment status coherent when the parcel is delivered.
      ...(becameDelivered ? { status: 'delivered' } : {}),
    },
  });

  if (becameDelivered) orderEvents.emit('order.delivered', { orderId: order.id });
}
