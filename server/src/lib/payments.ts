import crypto from 'node:crypto';
import { env } from '../env';

// ============================================================================
// PaymentGateway — one interface, two adapters (mirrors ImageStore). Razorpay
// when credentialed, else a mock gateway so the full flow is code-complete and
// activates on credentials. Only keyId is ever exposed to the browser.
//
// Signature algorithms follow Razorpay's documentation:
//  - payment:  HMAC-SHA256(`${order_id}|${payment_id}`, key_secret), hex
//  - webhook:  HMAC-SHA256(raw_request_body, webhook_secret), hex
// compared with crypto.timingSafeEqual.
// ============================================================================

export interface CreateGatewayOrderInput {
  amount: number; // paise (integer)
  currency: string;
  receipt: string;
}
export interface GatewayOrder {
  id: string;
  amount: number;
  currency: string;
}

export interface PaymentGateway {
  readonly mode: 'razorpay' | 'mock';
  readonly keyId: string;
  createOrder(input: CreateGatewayOrderInput): Promise<GatewayOrder>;
  verifyPaymentSignature(input: { orderId: string; paymentId: string; signature: string }): boolean;
  verifyWebhookSignature(input: { rawBody: Buffer; signature: string }): boolean;
}

const hmacHex = (secret: string, data: string | Buffer): string =>
  crypto.createHmac('sha256', secret).update(data).digest('hex');

const safeEqualHex = (a: string, b: string): boolean => {
  const ab = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
};

class RazorpayGateway implements PaymentGateway {
  readonly mode = 'razorpay' as const;
  readonly keyId = env.razorpay.keyId;
  private readonly secret = env.razorpay.keySecret;
  private readonly webhookSecret = env.razorpay.webhookSecret;

  async createOrder(input: CreateGatewayOrderInput): Promise<GatewayOrder> {
    const auth = Buffer.from(`${this.keyId}:${this.secret}`).toString('base64');
    const res = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: input.amount, currency: input.currency, receipt: input.receipt }),
    });
    if (!res.ok) {
      throw new Error(`Razorpay create order failed: ${res.status} ${await res.text()}`);
    }
    const data = (await res.json()) as { id: string; amount: number; currency: string };
    return { id: data.id, amount: data.amount, currency: data.currency };
  }

  verifyPaymentSignature({ orderId, paymentId, signature }: { orderId: string; paymentId: string; signature: string }): boolean {
    return safeEqualHex(hmacHex(this.secret, `${orderId}|${paymentId}`), signature);
  }

  verifyWebhookSignature({ rawBody, signature }: { rawBody: Buffer; signature: string }): boolean {
    return safeEqualHex(hmacHex(this.webhookSecret, rawBody), signature);
  }
}

// Dev fallback. Signs with fixed dev secrets so the full verify path runs
// end-to-end without a Razorpay account (see the pay-mock endpoint + webhook test).
class MockGateway implements PaymentGateway {
  readonly mode = 'mock' as const;
  readonly keyId = 'rzp_test_mock';
  readonly secret = 'mock-key-secret';
  readonly webhookSecret = 'mock-webhook-secret';

  async createOrder(input: CreateGatewayOrderInput): Promise<GatewayOrder> {
    return {
      id: `order_mock_${crypto.randomUUID().replace(/-/g, '').slice(0, 14)}`,
      amount: input.amount,
      currency: input.currency,
    };
  }

  verifyPaymentSignature({ orderId, paymentId, signature }: { orderId: string; paymentId: string; signature: string }): boolean {
    return safeEqualHex(hmacHex(this.secret, `${orderId}|${paymentId}`), signature);
  }

  verifyWebhookSignature({ rawBody, signature }: { rawBody: Buffer; signature: string }): boolean {
    return safeEqualHex(hmacHex(this.webhookSecret, rawBody), signature);
  }

  // Dev-only: stand in for Razorpay Checkout by producing a signed payment result.
  simulatePayment(orderId: string): { paymentId: string; signature: string } {
    const paymentId = `pay_mock_${crypto.randomUUID().replace(/-/g, '').slice(0, 14)}`;
    return { paymentId, signature: hmacHex(this.secret, `${orderId}|${paymentId}`) };
  }
}

function createGateway(): PaymentGateway {
  const { keyId, keySecret } = env.razorpay;
  if (keyId && keySecret) {
    // eslint-disable-next-line no-console
    console.log('[payments] Razorpay configured — test-mode gateway.');
    return new RazorpayGateway();
  }
  // eslint-disable-next-line no-console
  console.log('[payments] Razorpay not configured — payments in mock mode.');
  return new MockGateway();
}

export const paymentGateway = createGateway();
export { MockGateway };
