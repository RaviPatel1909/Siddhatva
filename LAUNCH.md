# LAUNCH.md — production deploy runbook

The **manual** steps to take Siddhatva live. The codebase is already deploy-ready
(see [What's ready](#whats-already-deploy-ready)); this is the click-through for the
infrastructure. Nothing here is automated — accounts, dashboards, and secrets are set
by you.

Feature-specific runbooks referenced below: `PAYMENTS.md` (Razorpay), `RESEND.md`
(email + DNS), `SHIPROCKET.md` (shipping). Working rules: `CLAUDE.md`.

---

## Architecture — what deploys where

| Piece | Build → run | Host (examples) |
|-------|-------------|-----------------|
| **Frontend** (React + Vite SPA) | `npm run build` → static files in `build/` | Vercel / Netlify / Cloudflare Pages |
| **Backend** (Express + Prisma) | `npm run build` → `dist/`, run `node dist/index.js` | Railway / Render / Fly.io |
| **Database** | managed Postgres, `DATABASE_URL` | Neon / Supabase / RDS / Railway |
| **Images** | Cloudinary (env-selected) | Cloudinary |
| **Payments** | Razorpay (live after KYC) | Razorpay |
| **Email** | Resend (after domain verify) | Resend |
| **Shipping** | Shiprocket (after paid tier) | Shiprocket |
| **Analytics** | GA4 (`VITE_GA4_ID`) | Google Analytics |

Each external service has a **dev fallback**, so the app runs with only a database;
you can go live incrementally, turning on each integration by setting its env vars
(no code changes — the interface-seam pattern, see `CLAUDE.md`).

---

## What's already deploy-ready

- Frontend builds to **`build/`** (`vite.config.ts` `outDir`), gitignored.
- Backend builds to **`dist/`** and starts with **`node dist/index.js`** (verified).
- **All config via env** — no hardcoded hosts/ports (dev defaults in `server/src/env.ts`
  are overridden by env vars in prod).
- **`.env` files are gitignored**; only `.env.example` is committed, complete for both
  frontend (root) and backend (`server/`).
- **Graceful shutdown** on SIGTERM/SIGINT (drains in-flight requests, closes Prisma).
- **Rate limiting** reads the real client IP via `X-Forwarded-For` when `TRUST_PROXY=true`,
  resolved through Express `trust proxy` using `TRUST_PROXY_HOPS` — a **measured** hop
  count, not a guess (see below).
- **CI**: `.github/workflows/ci.yml` typechecks + builds both packages and runs the
  e2e suite against a real Postgres.
- **Production migrations**: `npm run migrate:deploy` (= `prisma migrate deploy`).

---

## Accounts to create first (lead-time items — start early)

- **Razorpay KYC** — required for live keys (business verification, real-world
  turnaround). Test mode works today with no KYC.
- **Resend domain verification** — SPF/DKIM/DMARC DNS records; propagation can take up
  to ~48h. Until Verified, real emails are rejected/spam-foldered (`RESEND.md`).
- **Shiprocket** — API access needs a **paid tier** (~₹499/mo) + an API user
  (`SHIPROCKET.md`).
- Plus: GitHub repo, a backend host, a static-frontend host, a managed Postgres, a
  Cloudinary account, a GA4 property, and your domain's DNS.

---

## Steps

### 0. Push to GitHub
`.env` files are already untracked. Push the branch and open a PR — **CI must be green**
(build + e2e) before you deploy.

```bash
git push -u origin phase-9-launch   # then merge to main via PR
```

### 1. Managed Postgres
Create a database and copy its connection string. Most managed providers require TLS —
keep their `?sslmode=require` suffix. This becomes `DATABASE_URL`.

### 2. Backend service (Railway / Render / Fly)
- **Root directory:** `server/`
- **Build command:** `npm ci && npm run prisma:generate && npm run build`
- **Release / pre-deploy command:** `npm run migrate:deploy`
  (applies committed migrations, no interactive prompts — never run `migrate dev` in prod)
- **Start command:** `node dist/index.js` (or `npm start`)
- **Environment variables** (from `server/.env.example`, with production values):

  | Var | Value |
  |-----|-------|
  | `NODE_ENV` | `production` |
  | `DATABASE_URL` | from step 1 |
  | `CORS_ORIGINS` | comma-separated allowed frontend origins, e.g. `https://siddhatva.com,http://localhost:3000` |
  | `APP_URL` | your frontend URL (used in email links) |
  | `PUBLIC_URL` | your backend URL, e.g. `https://api.siddhatva.com` |
  | `TRUST_PROXY` | `true` (behind the host's proxy) |
  | `TRUST_PROXY_HOPS` | proxy hops in front of the server — **measure it**, see below. `3` for the current Cloudflare → Render setup |
  | `JWT_ACCESS_SECRET` | a strong random string — `openssl rand -hex 32` |
  | `CLOUDINARY_CLOUD_NAME` / `_API_KEY` / `_API_SECRET` | from Cloudinary |
  | `RAZORPAY_KEY_ID` / `_KEY_SECRET` / `_WEBHOOK_SECRET` | from Razorpay |
  | `RESEND_API_KEY`, `EMAIL_FROM` | from Resend (verified domain) |
  | `SHIPROCKET_EMAIL` / `_PASSWORD` / `_WEBHOOK_TOKEN` (+ `_CHANNEL_ID`, `_PICKUP_LOCATION`) | from Shiprocket |

  Any integration whose vars you leave unset stays in its **dev fallback** (mock
  payments/shipping, dev email, local image store) — safe, but not real. Turn them on
  when ready.

#### Measuring `TRUST_PROXY_HOPS` (do this whenever the infra in front changes)

Rate limiting keys on `req.ip`, which Express resolves by walking `X-Forwarded-For`
inward by exactly this many hops. **It cannot be reasoned out — measure it.** Two
attempts to infer it from first principles both shipped broken.

1. Trip a limiter from a machine whose public IP you know: 25 × `POST {}` to
   `/api/auth/register`, sending **no** `X-Forwarded-For` of your own. The limiter
   runs before validation, so these are `400`s and create no accounts.
2. In the host's logs find
   `[security] {"event":"security.rate_limited",...,"forwarded":"..."}` and read the
   chain, e.g. `223.181.72.69, 172.69.94.230, 10.28.61.119`.
3. Count **every address in front of your own**, then **add 1 for the socket**. Above:
   your IP + a Cloudflare edge + a Render internal address, plus the socket ⇒ **3**.

Sanity-check the result by re-probing after deploy: a run with no `X-Forwarded-For`
must still trip at the limit, **and** a run varying a forged `X-Forwarded-For` must
also trip. If forged headers keep earning fresh `400`s the count is too high; if
nothing ever trips it is too low. Either way, revert and re-measure.

### 3. Frontend (Vercel / Netlify)
- **Build command:** `npm run build`  ·  **Output directory:** `build`
- **Environment variables** (build-time — rebuild after changing):
  - `VITE_API_URL` = `https://api.siddhatva.com/api` (your backend + `/api`)
  - `VITE_GA4_ID` = `G-XXXXXXXXXX` (omit to leave analytics off)
- **SPA fallback (required):** the app uses client-side routing, so the host must serve
  `index.html` for all unknown paths, or deep links (`/product/1`, `/account/orders`)
  404 on refresh.
  - Vercel: pick framework **Vite** (auto), or add a rewrite `/(.*) → /index.html`.
  - Netlify: add `public/_redirects` with `/*  /index.html  200`.

### 4. Register webhooks (the payment + delivery source of truth)
- **Razorpay** → Dashboard → Webhooks → URL `https://api.siddhatva.com/api/webhooks/razorpay`,
  events `payment.captured` + `payment.failed`, secret = `RAZORPAY_WEBHOOK_SECRET`
  (`PAYMENTS.md`).
- **Shiprocket** → Settings → API → Webhooks → URL
  `https://api.siddhatva.com/api/webhooks/shiprocket`, token = `SHIPROCKET_WEBHOOK_TOKEN`
  (sent as the `x-api-key` header) (`SHIPROCKET.md`).

### 5. Data — do NOT seed the demo catalog in prod
`npm run seed` loads the **demo** catalog (14 sample products) — that's for local dev,
not a real store. For production:
1. Run `npm run migrate:deploy` (step 2) to create the schema — **do not run `seed`**.
2. Create your admin: register through the app, then promote in the DB:
   `UPDATE "User" SET role = 'ADMIN' WHERE email = 'you@yourdomain.com';`
3. Add real products via the admin product form (prices set individually, in ₹).

`prisma/seed.ts` itself now refuses to run unless `DATABASE_URL`'s host is
`localhost`/`127.0.0.1` (or `NODE_ENV=production` is set) — a hardcoded local
`.env` accidentally left pointed at production reached exactly this failure mode
once already. Never point a local `.env` at a production `DATABASE_URL`; if you
must run an ad-hoc query against prod, use a throwaway shell env var, not the
checked-in-shape `server/.env` file, and never run `npm run seed` in that state.

### 6. DNS + domain verification
- Point your apex/`www` domain at the frontend host and an `api.` subdomain at the
  backend host; then set `CORS_ORIGINS` / `APP_URL` / `VITE_API_URL` to the real domains
  and redeploy.
- Add the **Resend** SPF/DKIM/DMARC records (`RESEND.md`) — real email won't deliver
  until the domain shows **Verified**.

---

## Post-deploy smoke test

- [ ] Home + Shop load real products (not the "preparing" fallback).
- [ ] Register → login; deep-link refresh (`/product/1`) works (SPA fallback).
- [ ] Full purchase: checkout → Razorpay → confirmation shows **PAID**; the charged ₹
      equals the displayed total; a confirmation email arrives.
- [ ] Admin creates a shipment → `order.shipped` email arrives; Track Order shows the
      timeline; a Shiprocket tracking update advances the status.
- [ ] Forgot/reset password email arrives and the reset works.
- [ ] Lighthouse on the production URL (target 90+ perf/a11y/best-practices/SEO).

---

## Ongoing / operations

- **Migrations:** author locally with `prisma migrate dev`, commit the generated files,
  and apply in prod with `npm run migrate:deploy` on every deploy (release step).
  Migrations are forward-only — write reversible ones for anything destructive.
- **Rollback:** redeploy the previous build/image; a deploy that only changed code (no
  migration) rolls back cleanly.
- **Secrets:** live only in the host dashboards. `.env` is gitignored — never commit real
  keys. Rotate `JWT_ACCESS_SECRET` and provider keys if ever exposed.
- **CSP (optional hardening):** if you add a Content-Security-Policy, allow
  `fonts.googleapis.com`/`fonts.gstatic.com` (fonts), `googletagmanager.com` +
  `google-analytics.com` (GA4), the Razorpay checkout origins, and account for the
  async-font `onload` inline handler in `index.html` (use a nonce or a small external
  script). The product JSON-LD (`type="application/ld+json"`) is not executable and
  needs no allowance.

---

## Deferred to v2 (not part of this launch)

- **WhatsApp order notifications** — deferred (email already covers notifications).
  Needs Meta WhatsApp Business verification; slots in later as a `NotificationProvider`
  subscriber on the existing order lifecycle event bus. See `Siddhatva - context`
  roadmap.
