# Email runbook (Resend, transactional)

Order lifecycle emails send via **Resend**. Without a key the app runs in **dev
mode** — every email is rendered and written to `server/.mail/*.html` (and logged),
so the whole flow is exercisable locally. Adding a key switches to real sends with
**zero code change** (mirrors the image store and payment gateway). The API key is
**server-side only**.

## What sends, and when

Emails subscribe to the **order lifecycle event bus** (`server/src/lib/events.ts`),
not to route handlers:

| Event | Email | Trigger |
|-------|-------|---------|
| `order.paid` | Order confirmation | payment verified (`/orders/verify` or the webhook) |
| `order.shipped` | Shipping notification | admin transitions the order to `shipped` |

Sends are **idempotent** — a `SentEmail` row keyed `(orderId, type)` is claimed
before sending, so a duplicate event (webhook retry, repeated admin PATCH) is a
no-op. A send failure rolls the claim back so a later retry can send.

Templates are **React Email** components in `server/src/emails/`, styled in the
storefront's design system (bronze `#b87b5a`, cream `#fff9ed`, Geist) via
`emails/theme.ts`. A password-reset template (`PasswordResetEmail.tsx`) is included
and ready to send; wiring a forgot-password flow (token issuance + endpoint + UI) is
a separate auth change — the branded template is already in place.

## Dev mode (no key) — the default

With `RESEND_API_KEY` unset, the server logs
`[email] Resend not configured — emails in dev mode (console + .mail/).` and each
email is:

- summarized to the console (recipient, subject, plain-text preview), and
- written to `server/.mail/NNNN-<subject>.html` — open it in a browser to see the
  actual branded email. (`server/.mail/` is gitignored.)

## Enabling real sends

1. Create a Resend account and an **API key** (Dashboard → API Keys).
2. Put it in `server/.env`:

   ```
   RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
   EMAIL_FROM="Siddhatva <orders@yourdomain.com>"
   ```

   Restart the server — it logs `[email] Resend configured — sending via Resend.`
3. For a first smoke test you may send from Resend's shared
   `onboarding@resend.dev` without a domain, but production sends require your own
   verified domain (below).

## ⚠️ Domain verification (DNS) is required before real inbox delivery

**This is DNS setup + propagation, not code — flag it early.** Sending from your own
`EMAIL_FROM` domain requires verifying it in Resend, which means adding DNS records
and waiting for propagation (minutes to ~48h). Until the domain is **Verified**,
real sends will be rejected or land in spam:

1. Resend Dashboard → **Domains** → Add your domain.
2. Add the records Resend shows to your DNS provider:
   - **SPF** — a `TXT` record authorizing Resend to send for the domain.
   - **DKIM** — the `CNAME`/`TXT` record(s) Resend generates (cryptographic signing).
   - **DMARC** — a `TXT` record at `_dmarc.yourdomain.com` (start with
     `v=DMARC1; p=none;` to monitor, then tighten to `quarantine`/`reject`).
3. Wait for Resend to show the domain **Verified** (it polls DNS).
4. Set `EMAIL_FROM` to an address **on that verified domain**.

Without SPF/DKIM/DMARC aligned, mailbox providers (Gmail, Outlook) will fail
authentication and drop or spam-folder the mail — so this DNS step gates real
delivery even though the code is complete.

## Verifying the flow

- **Dev (no key):** place an order and pay (mock mode) → `order.paid` writes an
  order-confirmation email to `server/.mail/`. Ship it from the admin drawer →
  `order.shipped` writes a shipping email. Fire the same event twice → still one
  email (idempotent).
- **Real:** set the key + verified domain, repeat, and confirm receipt in the inbox.
