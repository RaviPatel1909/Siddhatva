import { Request, Response, Router } from 'express';
import { paymentGateway } from '../lib/payments';
import { findOrderByRazorpayOrderId, markOrderFailed, markOrderPaid } from '../lib/orderPayments';
import { securityEvent } from '../lib/securityLog';

export const webhookRouter = Router();

interface RazorpayWebhook {
  event?: string;
  payload?: { payment?: { entity?: { id?: string; order_id?: string } } };
}

// POST /webhooks/razorpay — the SOURCE OF TRUTH for payment state. Mounted with
// express.raw BEFORE express.json, so req.body is the raw Buffer required for
// signature verification. Always 200 on a handled event so Razorpay stops
// retrying (non-2xx triggers 24h exponential-backoff retries then disables it);
// 400 only when the signature is invalid.
webhookRouter.post('/', async (req: Request, res: Response) => {
  const rawBody = req.body as Buffer;
  const signature = req.header('x-razorpay-signature') ?? '';
  if (!Buffer.isBuffer(rawBody) || !paymentGateway.verifyWebhookSignature({ rawBody, signature })) {
    securityEvent('payment.webhook_signature_invalid', { ip: req.ip });
    res.status(400).json({ message: 'Invalid webhook signature' });
    return;
  }

  let event: RazorpayWebhook;
  try {
    event = JSON.parse(rawBody.toString('utf8')) as RazorpayWebhook;
  } catch {
    res.status(400).json({ message: 'Invalid webhook body' });
    return;
  }

  try {
    const entity = event.payload?.payment?.entity;
    const razorpayOrderId = entity?.order_id;
    if (razorpayOrderId) {
      const order = await findOrderByRazorpayOrderId(razorpayOrderId);
      if (order) {
        if (event.event === 'payment.captured') {
          await markOrderPaid(order.id, entity?.id ?? null); // idempotent
        } else if (event.event === 'payment.failed') {
          await markOrderFailed(order.id);
        }
      }
    }
  } catch (err) {
    // We verified + accepted the event; a handler error shouldn't cause retries.
    // eslint-disable-next-line no-console
    console.error('[webhook] handler error', err);
  }

  res.status(200).json({ received: true });
});
