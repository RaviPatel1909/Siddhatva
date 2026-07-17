# Deployment Validation Checklist

A **repeatable, per-release** checklist. Run it against a **Vercel Preview
deployment** before merging to `main` / promoting to production.

**Why a preview deploy specifically?** Security headers — most importantly the
enforced **Content-Security-Policy** — are applied by **Vercel** (`vercel.json`),
*not* by the local Vite dev server or `vite preview`. So a CSP or header regression
is only observable on a real Vercel deployment. Local green ≠ production-safe for
anything header-dependent.

Related docs (don't duplicate — follow the links):
- **Infra / one-time setup + secrets + webhooks:** [`LAUNCH.md`](../LAUNCH.md)
- **CSP policy, allowed origins, and rollback:** [`docs/CSP.md`](./CSP.md)
- **Payments / email / shipping runbooks:** `PAYMENTS.md`, `RESEND.md`, `SHIPROCKET.md`

---

## 0. Automated pre-gates (must be green before deploying)

Run locally (or confirm CI is green) — the manual checks below start where these end.

- [ ] **Frontend typecheck** — `npm run typecheck`
- [ ] **Server typecheck** — `npm --prefix server run typecheck`
- [ ] **Frontend build** — `npm run build`
- [ ] **Server build** — `npm --prefix server run build`
- [ ] **Playwright suite green** — `npm run test:e2e` (stack up + DB seeded)
- [ ] **CSP guard green** — `e2e/csp.spec.ts` (part of the suite; asserts the policy is
      enforcing, `api.siddhatva.in` allowed, `onrender` gone, no unsafe primitives)
- [ ] **`vercel.json` is valid JSON** and lockfiles/`package.json` unchanged unless a
      dependency change was intended (`npm ci` clean — see CLAUDE.md)

## 1. Deploy the preview

- [ ] Push the branch / open the PR so Vercel builds a **Preview** URL
- [ ] Backend (Render) is reachable at `https://api.siddhatva.in` (free tier may need a
      warm-up request after idle)
- [ ] Open the Preview URL in a **fresh** browser profile (no extensions) with
      **DevTools → Console + Network** open for the whole pass

> **How to spot a CSP violation:** the Console prints
> `Refused to load/connect/frame … because it violates the following Content Security
> Policy directive: "<directive>"`. The Network tab shows the request **(blocked:csp)**.
> Any such entry is a **fail** — fix the policy (see `docs/CSP.md`), never weaken it.

---

## 2. General

- [ ] Homepage loads (real content, not the "preparing" fallback)
- [ ] **No console errors**
- [ ] **No CSP violations** in console
- [ ] **No blocked network requests** (no `(blocked:csp)` / `(blocked:mixed-content)`)
- [ ] Responsive layouts render correctly at **375** and **1280**
- [ ] Deep-link + hard refresh works (e.g. `/product/1`, `/search?q=blazer`) — SPA fallback

## 3. Store

- [ ] Collections / Shop grid loads products
- [ ] Product detail pages render (images, variants, price)
- [ ] Search (`/search?q=`) returns results and the empty state is honest
- [ ] Filters (category / color / size / sort) apply and compose
- [ ] Wishlist add / remove
- [ ] Cart add / update quantity / remove; totals display

## 4. Authentication

- [ ] Register a new account
- [ ] Login
- [ ] Logout
- [ ] Session refresh (reload a protected page — access token restores via `/auth/refresh`)
- [ ] Protected routes redirect to login when unauthenticated; reachable when authed

## 5. Checkout

- [ ] Cart → checkout flow (information → shipping → payment)
- [ ] Shipping address form validates; country locked to India
- [ ] Order creation succeeds (server-priced — the displayed total is authoritative)
- [ ] **Razorpay popup opens** (script from `checkout.razorpay.com`, iframe not blocked)
- [ ] **Payment success** → verified `PAID`; the charged ₹ equals the displayed total
- [ ] Payment failure / dismiss leaves the cart + order intact for retry
- [ ] Order confirmation page shows the correct order + PAID state
- [ ] **No CSP `frame-src`/`connect-src` violations during the real payment** (incl. any
      3DS / bank / UPI step — if one is blocked, see the Razorpay note in `docs/CSP.md`)

## 6. Account

- [ ] Orders list shows the user's orders (and only theirs)
- [ ] Profile loads / edits
- [ ] Address shown on the order / confirmation

## 7. Admin

- [ ] Dashboard loads with real aggregates (KPIs, chart, zero-states)
- [ ] **Analytics** dashboard (`/admin/analytics`) — widgets, native-SVG chart,
      URL-driven date filters, independent widget states
- [ ] Product management — list, create, edit, delete
- [ ] **Image uploads** — see Media below
- [ ] Inventory (low / out-of-stock) reflects real variant stock
- [ ] Orders — list, status transitions, create shipment
- [ ] Topbar search across products / orders / customers

## 8. Media

- [ ] **Cloudinary uploads** — admin image upload POSTs to `api.cloudinary.com` and
      persists (no `connect-src` violation); uploaded image renders from `res.cloudinary.com`
- [ ] Product images load (`res.cloudinary.com` + seed `lh3.googleusercontent.com`)
- [ ] Icons (Material Symbols) render
- [ ] Fonts (Geist) load from `fonts.gstatic.com` (no `font-src`/`style-src` violation)

## 9. Analytics

*(Only exercisable when `VITE_GA4_ID` is set in the deployment env.)*
- [ ] **GTM / gtag loads** — `www.googletagmanager.com/gtag/js` not blocked (`script-src`)
- [ ] **GA4 requests succeed** — collection to `*.google-analytics.com` not blocked
      (`connect-src`); confirm funnel events fire (view_item / add_to_cart /
      begin_checkout / purchase) via DevTools Network or GA4 DebugView
- [ ] If `VITE_GA4_ID` is unset, GA is inert by design — record "N/A (GA disabled)"

## 10. Security (CSP + headers)

Verify in DevTools across the flows above:
- [ ] **Zero CSP violations** in the console (entire session)
- [ ] **No blocked scripts** (`script-src`)
- [ ] **No blocked XHR/fetch** (`connect-src` — API, Cloudinary, Razorpay, GA)
- [ ] **No blocked frames** (`frame-src` — Razorpay checkout iframe)
- [ ] **No mixed-content warnings** (`upgrade-insecure-requests` in effect)
- [ ] Response headers on the document confirm **`Content-Security-Policy`** (enforcing,
      **not** `-Report-Only`) plus `X-Frame-Options: DENY`, `X-Content-Type-Options:
      nosniff`, `Referrer-Policy`, and HSTS (check via Network → the document request →
      Response Headers, or `curl -sI <preview-url>`)

> If any check fails: **fix the policy, do not bypass it.** Rollback is a one-line
> revert of the header key to `-Report-Only` (see `docs/CSP.md`).

---

## Release Validation — sign-off

Complete only when every section above passes on the Preview deployment.

- [ ] **Frontend Build**
- [ ] **Server Build**
- [ ] **Typecheck**
- [ ] **Playwright**
- [ ] **Preview Deployment**
- [ ] **Manual Browser Verification**
- [ ] **CSP Validation**
- [ ] **Ready for Production**

| Field | Value |
|---|---|
| Release / PR | |
| Preview URL | |
| Validated by | |
| Date | |
| Notes / exceptions | |

> Only promote to production (merge to `main` / production deploy) after **Ready for
> Production** is checked. Production rollback: redeploy the previous build; a
> code-only change (no migration) rolls back cleanly — see `LAUNCH.md` → Operations.
