import { prisma } from '../prisma';
import { orderEvents } from './events';

// Idempotent: marks an order PAID exactly once, emitting order.paid only on the
// transition. Safe to call from BOTH /orders/verify and the webhook, any number
// of times (Razorpay retries webhooks; verify + webhook both fire).
export async function markOrderPaid(
  orderId: string,
  razorpayPaymentId: string | null
): Promise<'paid' | 'already' | 'not_found'> {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return 'not_found';
  if (order.paymentStatus === 'PAID') return 'already';
  await prisma.order.update({
    where: { id: orderId },
    data: { paymentStatus: 'PAID', razorpayPaymentId: razorpayPaymentId ?? order.razorpayPaymentId },
  });
  orderEvents.emit('order.paid', { orderId, razorpayPaymentId });
  return 'paid';
}

// Marks a still-unpaid order FAILED (never downgrades a PAID order).
export async function markOrderFailed(orderId: string): Promise<void> {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || order.paymentStatus === 'PAID') return;
  await prisma.order.update({ where: { id: orderId }, data: { paymentStatus: 'FAILED' } });
}

export const findOrderByRazorpayOrderId = (razorpayOrderId: string) =>
  prisma.order.findFirst({ where: { razorpayOrderId } });
