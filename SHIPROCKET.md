# Shipping runbook (Shiprocket, two-way)

Shipping uses **Shiprocket**. Without credentials the app runs in **mock mode** so
the whole two-way flow — create a shipment (outbound) and receive tracking updates
(inbound webhook) — is exercisable locally with no account. Adding credentials
switches to the real provider with **zero code change** (mirrors the payment gateway
and image store). Credentials + webhook token are **server-side only**.

**Prepaid only.** This store takes card/UPI only — there is **no COD**. An order can
only be shipped after `paymentStatus = PAID` (the ship route enforces this).

## The flow

**Outbound — admin creates the shipment**

1. Admin opens a **PAID** order in the order drawer → **Create Shipment**.
2. `POST /api/admin/orders/:id/ship` (admin) guards PAID, calls
   `ShippingProvider.createShipment`, persists `awb`/`courier`/`labelUrl`/
   `trackingUrl`, sets `shippingStatus = shipment_created`, advances fulfillment
   `status` to `shipped`, and emits **`order.shipped`** on the lifecycle bus (which
   triggers the Phase 7 shipping email). **Idempotent** — re-calling returns the
   existing shipment, never a duplicate.

**Inbound — tracking webhook is the source of truth**

3. `POST /api/webhooks/shiprocket` (mounted with `express.raw` **before**
   `express.json`, same discipline as the Razorpay webhook) receives tracking
   events. Authenticity is verified via the **`x-api-key`** header against
   `SHIPROCKET_WEBHOOK_TOKEN`. Always returns **200** on a handled event (Shiprocket
   expects only a 200); **401** only on a missing/bad token.
4. Each event maps Shiprocket's status → our normalized `shippingStatus`
   (`in_transit` / `out_for_delivery` / `delivered` / `cancelled`), updates the order
   **idempotently and monotonically** (never moves backwards), and on the transition
   into `delivered` emits **`order.delivered`**. Duplicate events are no-ops.

**Customer** — the account Orders page has a **Track Order** action showing the live
`shippingStatus` timeline + courier + AWB + a link to the courier tracking URL, with a
graceful "preparing to ship" state before a shipment exists.

## Normalized status

`not_shipped → shipment_created → in_transit → out_for_delivery → delivered`
(plus `cancelled` for RTO/cancellations). This is **distinct** from fulfillment
`status` and `paymentStatus` — it is never overloaded onto them.

## Mock mode (no credentials) — the default

The server logs `[shipping] Shiprocket not configured — shipments in mock mode.` and:

- `createShipment` returns a **deterministic** shipment id / AWB / courier / label /
  tracking URL derived from the order id (stable across calls).
- The two-way path is driven by POSTing Shiprocket-shaped bodies to
  `/api/webhooks/shiprocket` with the dev token `mock-shiprocket-webhook-token` (see
  `e2e/shipping.spec.ts`), advancing the shipment through in-transit →
  out-for-delivery → delivered.

## Enabling real Shiprocket

1. Create a Shiprocket account. **API access requires a paid tier** (≈ ₹499/mo
   *Advanced* at time of writing) — build/test is free in mock mode; you only need
   the paid plan to go live.
2. Settings → **API** → **Configure** / **Add New API User** → create a dedicated API
   user (email + password). Put them in `server/.env`:

   ```
   SHIPROCKET_EMAIL=api-user@yourdomain.com
   SHIPROCKET_PASSWORD=the-api-user-password
   SHIPROCKET_PICKUP_LOCATION=Primary        # a pickup location you've added
   SHIPROCKET_CHANNEL_ID=xxxxxx              # optional: your custom channel id
   ```

   Restart the server — it logs `[shipping] Shiprocket configured — using
   ShiprocketProvider.`
3. **Token model:** the login token (`POST /auth/login`) **expires**. The provider
   caches it and only refreshes on a `401` — it does **not** log in per request.
4. Register the **tracking webhook**: Settings → **API → Webhooks** → set the URL to
   `https://<your-host>/api/webhooks/shiprocket` and a secret token; set the same
   value as `SHIPROCKET_WEBHOOK_TOKEN` (verified via the `x-api-key` header).

## Operational watch-out — declare weights accurately

Shiprocket bills on **volumetric/actual weight**, and **weight disputes are the most
common billing issue**: if the declared package weight/dimensions are lower than what
the courier measures, you get back-charged (and shipments can be held). The provider
sends default dimensions/weight per order — **tune these per your catalog** (set real
product weights) before going live. Reconcile the Shiprocket weight-discrepancy report
regularly.
