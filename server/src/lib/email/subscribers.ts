import { Prisma } from '@prisma/client';
import { prisma } from '../../prisma';
import { env } from '../../env';
import { orderEvents } from '../events';
import { orderInclude, OrderWithRelations } from '../mappers';
import { OrderEmailData } from '../../emails/types';
import { renderOrderConfirmation, renderShippingNotification } from '../../emails/render';
import { emailService } from './service';

type EmailType = 'order_confirmation' | 'shipping_notification';

// Map an order row (+ its user) to the plain data the templates render from.
function toOrderEmailData(order: OrderWithRelations): OrderEmailData {
  return {
    orderId: order.id,
    customerName: order.customerName,
    items: order.items.map((it) => ({
      name: it.name,
      variant: it.variant,
      quantity: it.quantity,
      price: it.price,
    })),
    subtotal: order.subtotal,
    shipping: order.shipping,
    tax: order.tax,
    total: order.total,
    shippingAddress: {
      name: order.shippingAddress.name,
      line1: order.shippingAddress.line1,
      city: order.shippingAddress.city,
      state: order.shippingAddress.state,
      zip: order.shippingAddress.zip,
      country: order.shippingAddress.country,
    },
    orderUrl: `${env.appUrl}/account/orders`,
  };
}

// Claim the (orderId, type) slot BEFORE sending. Returns false if another send
// already claimed it (unique-constraint violation) — the caller then skips,
// giving us don't-double-send idempotency even if the event fires twice.
async function claimSend(orderId: string, type: EmailType, to: string): Promise<boolean> {
  try {
    await prisma.sentEmail.create({ data: { orderId, type, to } });
    return true;
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return false; // already sent
    }
    throw err;
  }
}

async function sendOrderEmail(orderId: string, type: EmailType): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { ...orderInclude, user: true },
  });
  if (!order) return;
  const to = order.user.email;

  // Reserve the slot first so a concurrent/duplicate event can't also send.
  if (!(await claimSend(orderId, type, to))) return;

  try {
    const data = toOrderEmailData(order);
    const rendered =
      type === 'order_confirmation'
        ? await renderOrderConfirmation(data)
        : await renderShippingNotification(data);
    await emailService.send({ to, email: rendered });
  } catch (err) {
    // Roll back the claim so a later retry (e.g. next webhook) can send again,
    // rather than silently swallowing the email.
    await prisma.sentEmail.deleteMany({ where: { orderId, type } });
    // eslint-disable-next-line no-console
    console.error(`[email] failed to send ${type} for ${orderId}`, err);
  }
}

let registered = false;

// Subscribe the email side-effects to the order lifecycle event bus. Called once
// at startup. This is the seam Phases 8-9 (logistics, WhatsApp) also hook into.
export function registerEmailSubscribers(): void {
  if (registered) return; // guard against double-registration in tests/watch
  registered = true;
  orderEvents.on('order.paid', ({ orderId }) => {
    void sendOrderEmail(orderId, 'order_confirmation');
  });
  orderEvents.on('order.shipped', ({ orderId }) => {
    void sendOrderEmail(orderId, 'shipping_notification');
  });
  // eslint-disable-next-line no-console
  console.log(`[email] subscribed to order.paid + order.shipped (${emailService.mode} mode).`);
}
