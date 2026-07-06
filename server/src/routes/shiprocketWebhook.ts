import crypto from 'node:crypto';
import { Request, Response, Router } from 'express';
import { env } from '../env';
import { applyShiprocketTracking } from '../lib/orderShipping';
import { MOCK_SHIPROCKET_WEBHOOK_TOKEN } from '../lib/shipping/mock';
import { shippingProvider } from '../lib/shipping/provider';

export const shiprocketWebhookRouter = Router();

// The token that authenticates inbound webhooks: the configured one in real
// mode, a fixed dev token in mock mode (so the flow is exercisable with no
// account). Compared against Shiprocket's `x-api-key` header.
const expectedToken =
  shippingProvider.mode === 'mock'
    ? MOCK_SHIPROCKET_WEBHOOK_TOKEN
    : env.shiprocket.webhookToken;

function tokenValid(provided: string): boolean {
  if (!expectedToken) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expectedToken);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

interface ShiprocketTrackingBody {
  awb?: string;
  current_status?: string;
  shipment_status?: string;
}

// POST /webhooks/shiprocket — INBOUND tracking, the source of truth for delivery
// state. Mounted with express.raw BEFORE express.json (same discipline as the
// Razorpay webhook). Shiprocket expects a 200 on any handled event; we return
// 401 only when the x-api-key is missing/wrong.
shiprocketWebhookRouter.post('/', async (req: Request, res: Response) => {
  const rawBody = req.body as Buffer;
  const providedToken = req.header('x-api-key') ?? '';
  if (!tokenValid(providedToken)) {
    res.status(401).json({ message: 'Invalid webhook token' });
    return;
  }

  let event: ShiprocketTrackingBody;
  try {
    event = JSON.parse(Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody));
  } catch {
    res.status(400).json({ message: 'Invalid webhook body' });
    return;
  }

  try {
    const awb = event.awb;
    const status = event.current_status ?? event.shipment_status;
    if (awb && status) {
      await applyShiprocketTracking(awb, status); // idempotent + monotonic
    }
  } catch (err) {
    // We accepted the event; a handler error shouldn't trigger retries.
    // eslint-disable-next-line no-console
    console.error('[shiprocket webhook] handler error', err);
  }

  res.status(200).json({ received: true });
});
