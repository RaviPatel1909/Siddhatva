import { apiFetch } from './client';
import { ApiOrder } from './types';

export interface PayInitResponse {
  razorpayOrderId: string;
  keyId: string;
  amount: number;
  currency: string;
  mode: 'razorpay' | 'mock';
}

export interface PaymentResult {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

// POST /orders/:id/pay-init — create a gateway order for this order.
export const payInit = (orderId: string): Promise<PayInitResponse> =>
  apiFetch<PayInitResponse>(`/orders/${orderId}/pay-init`, { method: 'POST' });

// POST /orders/verify — verify the Checkout result; returns the (now PAID) order.
export const verifyPayment = (result: PaymentResult): Promise<ApiOrder> =>
  apiFetch<ApiOrder>('/orders/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(result),
  });

// POST /orders/:id/pay-mock — dev only (mock gateway stands in for Checkout).
const payMock = (orderId: string): Promise<PaymentResult> =>
  apiFetch<PaymentResult>(`/orders/${orderId}/pay-mock`, { method: 'POST' });

interface RazorpayInstance {
  open(): void;
  on(event: string, handler: (resp: unknown) => void): void;
}
interface RazorpayOptions {
  key: string;
  order_id: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  prefill?: { name?: string; email?: string };
  handler: (resp: PaymentResult) => void;
  modal?: { ondismiss?: () => void };
}
type RazorpayCtor = new (opts: RazorpayOptions) => RazorpayInstance;

const CHECKOUT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';
let scriptPromise: Promise<void> | null = null;

function loadRazorpayScript(): Promise<void> {
  if (typeof window !== 'undefined' && (window as unknown as { Razorpay?: RazorpayCtor }).Razorpay) {
    return Promise.resolve();
  }
  if (!scriptPromise) {
    scriptPromise = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = CHECKOUT_SRC;
      script.onload = () => resolve();
      script.onerror = () => {
        scriptPromise = null;
        reject(new Error('Failed to load the payment gateway'));
      };
      document.body.appendChild(script);
    });
  }
  return scriptPromise;
}

// Collect a payment: open Razorpay Checkout (real mode) or simulate it via
// pay-mock (dev). Resolves with the result to POST to /verify; rejects when the
// user dismisses or the payment fails, leaving the cart + order intact for retry.
export async function collectPayment(
  orderId: string,
  init: PayInitResponse,
  prefill: { name?: string; email?: string }
): Promise<PaymentResult> {
  if (init.mode === 'mock') {
    return payMock(orderId);
  }
  await loadRazorpayScript();
  const Razorpay = (window as unknown as { Razorpay: RazorpayCtor }).Razorpay;
  return new Promise<PaymentResult>((resolve, reject) => {
    const rzp = new Razorpay({
      key: init.keyId,
      order_id: init.razorpayOrderId,
      amount: init.amount,
      currency: init.currency,
      name: 'Siddhatva',
      description: 'Order payment',
      prefill,
      handler: (resp) => resolve(resp),
      modal: { ondismiss: () => reject(new Error('Payment cancelled')) },
    });
    rzp.on('payment.failed', () => reject(new Error('Payment failed. Please try again.')));
    rzp.open();
  });
}
