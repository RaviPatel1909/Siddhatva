# Payments runbook (Razorpay, test mode)

Payments use Razorpay in **test mode** (`rzp_test_` keys — no KYC). Without keys
the app runs in **mock mode** so the whole flow is exercisable locally; adding
keys switches to the real gateway with zero code change (mirrors the image
store). Only `RAZORPAY_KEY_ID` ever reaches the browser.

## Flow

1. Checkout creates the order (`paymentStatus: PENDING`).
2. `POST /api/orders/:id/pay-init` → creates a Razorpay order (`amount = total × 100`
   paise, INR, `receipt = our order id`), stores `razorpayOrderId`.
3. The browser opens Razorpay Checkout with `{ key, order_id, amount, prefill }`.
4. On success, the handler `POST`s `{ razorpay_order_id, razorpay_payment_id,
   razorpay_signature }` to `/api/orders/verify`. The server verifies the HMAC
   and marks the order **PAID** (instant confirmation).
5. **The webhook is the source of truth.** Razorpay calls
   `POST /api/webhooks/razorpay` with `payment.captured`; the server verifies the
   raw-body HMAC and marks PAID **idempotently** (so a closed browser, or a
   double-fired webhook, still resolves correctly).

## Enabling real test mode

1. Create a free Razorpay account and switch the dashboard to **Test Mode**.
2. Settings → API Keys → **Generate Test Key**. Copy `rzp_test_...` key id + secret.
3. Put them in `server/.env`:

   ```
   RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
   RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
   RAZORPAY_WEBHOOK_SECRET=<chosen when registering the webhook, below>
   ```

   Restart the server — it logs `[payments] Razorpay configured — test-mode gateway.`

## Webhook (local)

Razorpay must reach your endpoint over HTTPS, so tunnel it:

```bash
ngrok http 4000
```

Then in the dashboard → Settings → **Webhooks** → Add New Webhook:

- **URL:** `https://<your-ngrok-subdomain>.ngrok-free.app/api/webhooks/razorpay`
- **Secret:** any strong string → also set as `RAZORPAY_WEBHOOK_SECRET`.
- **Active events:** `payment.captured` and `payment.failed`.

The endpoint returns `200` on any handled event so Razorpay stops retrying; a
non-2xx triggers 24h exponential-backoff retries and eventually disables the
webhook.

## Test cards / UPI (test mode)

- **Card:** `4111 1111 1111 1111`, any future expiry, any CVV, any name.
- **UPI (success):** `success@razorpay`  ·  **UPI (failure):** `failure@razorpay`
- Netbanking test banks simulate success/failure from the checkout UI.

See Razorpay's "Test Card Details" doc for the full list.

## Mock mode (no keys)

With no `RAZORPAY_*` set, the server logs `[payments] Razorpay not configured —
payments in mock mode.` and:

- `pay-init` returns a `order_mock_...` id and `mode: 'mock'`.
- The browser skips Razorpay Checkout and calls `POST /api/orders/:id/pay-mock`
  (dev only), which returns a validly-signed payment result to post to `/verify`.
- The webhook can be exercised by POSTing a `payment.captured` body signed with
  the dev webhook secret (`mock-webhook-secret`) — see `e2e/payments.spec.ts`.

The signature algorithms (HMAC-SHA256, hex, `timingSafeEqual`) are identical in
both modes, so the verification path is fully exercised in mock mode.
