# Content Security Policy

Siddhatva ships a single, **enforced** Content-Security-Policy. This is the
reference for what it allows and why.

## Where it lives (single source of truth)

- **The page CSP is defined once, in `vercel.json`** (`headers` → `source: "/(.*)"`).
  It is a response **header** (`Content-Security-Policy`), applied by Vercel to
  every response for the storefront/admin SPA. There is **no `<meta>` CSP** and no
  second copy — header CSP is stronger and centralized.
- The **Express API** (`server/src/middleware/securityHeaders.ts`) sets complementary
  headers (`X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`,
  HSTS) but **does not** set a CSP — it serves JSON, not framed HTML, so a page CSP
  there would be redundant. Keeping CSP only on the page responses avoids a duplicate
  definition to maintain.
- **The header only takes effect when served by Vercel.** It is *not* applied by the
  local Vite dev server or `vite preview`, so runtime CSP validation must be done on a
  **Vercel deployment** (preview or prod) — see "Validation & rollback" below.

## Directives and why each origin is allowed

Every non-`'self'` origin below maps to a resource the app actually loads (verified
against the implementation, not guessed).

| Directive | Value | Reason |
|---|---|---|
| `default-src` | `'self'` | Fallback for any directive not listed (e.g. `media-src`, `manifest-src`, `worker-src`) — the app has no cross-origin media/manifest/worker, so `'self'` suffices. |
| `base-uri` | `'self'` | Blocks `<base>` tag hijacking of relative URLs. |
| `object-src` | `'none'` | No `<object>`/`<embed>`/Flash — kill the plugin surface entirely. |
| `frame-ancestors` | `'none'` | Clickjacking protection — nobody may frame us (belt-and-suspenders with `X-Frame-Options: DENY`). |
| `form-action` | `'self'` | Forms only submit same-origin. All auth/checkout forms are React `fetch`, not native cross-origin POSTs; Razorpay is JS, not a form. |
| `upgrade-insecure-requests` | — | Defensively upgrades any stray `http:` subresource to `https` (everything is already https). |
| `script-src` | `'self' https://checkout.razorpay.com https://www.googletagmanager.com` | Own bundle + `/load-fonts.js` are same-origin (the build emits **no inline scripts**, so no `'unsafe-inline'`/`'unsafe-eval'`). `checkout.razorpay.com` = Razorpay Checkout script. `www.googletagmanager.com` = GA4 `gtag.js`. |
| `style-src` | `'self' 'unsafe-inline' https://fonts.googleapis.com` | Compiled CSS is same-origin. `fonts.googleapis.com` = Google Fonts stylesheet (Geist + Material Symbols). `'unsafe-inline'` is required for React inline `style={…}` attributes (e.g. dynamic confetti/chart positions) — low risk in **style**-src (cannot execute JS); scripts remain strict. |
| `font-src` | `'self' https://fonts.gstatic.com` | Google Fonts serve the actual font files from `fonts.gstatic.com`. |
| `img-src` | `'self' data: https://res.cloudinary.com https://lh3.googleusercontent.com` | `'self'` = favicons/textures. `res.cloudinary.com` = product images (live). `lh3.googleusercontent.com` = seed/mockup imagery. `data:` retained for third-party inline pixels (low risk in img-src). |
| `connect-src` | `'self' https://api.siddhatva.in https://api.cloudinary.com https://api.razorpay.com https://lumberjack.razorpay.com https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com` | `api.siddhatva.in` = the backend API (all fetch/XHR incl. auth refresh). `api.cloudinary.com` = signed direct browser image upload (`uploadImage`). `api.razorpay.com` + `lumberjack.razorpay.com` = Razorpay Checkout XHR + telemetry. `*.google-analytics.com` / `*.analytics.google.com` = GA4 collection (**regional** endpoints `region1..regionN` make an enumerated list impossible — Google's documented CSP). `www.googletagmanager.com` = gtag config fetch. |
| `frame-src` | `https://api.razorpay.com https://checkout.razorpay.com` | The Razorpay Checkout payment iframe. |

### Justified wildcards
The only wildcards are `https://*.google-analytics.com` and
`https://*.analytics.google.com`, scoped to Google-controlled analytics domains over
https. They are **unavoidable**: GA4 routes collection to region-specific hosts
(`region1`, `region2`, …) chosen per user, so a fixed host list would silently drop
hits for some regions. This is Google's own recommended CSP. No bare `*`, no
`'unsafe-inline'`/`'unsafe-eval'` in `script-src`.

## What changed at enforcement (from the prior Report-Only policy)
1. `connect-src`: **removed** the obsolete `https://siddhatva.onrender.com`; **added**
   `https://api.siddhatva.in` (the real API — the migration blocker).
2. `connect-src` GA: `www.google-analytics.com` + `region1.google-analytics.com` +
   `analytics.google.com` → `*.google-analytics.com` + `*.analytics.google.com`
   (regional correctness); added `www.googletagmanager.com`.
3. Added `upgrade-insecure-requests`.
4. Header flipped `Content-Security-Policy-Report-Only` → `Content-Security-Policy`.

## Validation & rollback
- **Validate on a Vercel preview deployment** (the header is Vercel-applied), with the
  browser console open, before promoting to production. Exercise: home/collections/
  product/search, login/register, cart → **checkout with a real Razorpay payment**
  (incl. any 3DS/bank step), account/orders, and admin (analytics dashboard, product
  management, **image upload**). Confirm **zero** `Content-Security-Policy` console
  violations and no blocked requests.
- **If Razorpay blocks a frame/connect during a real bank/3DS/UPI flow**, broaden only
  those two directives to `https://*.razorpay.com` (Razorpay's documented fallback) —
  do not weaken `script-src`.
- **Rollback** is a one-line revert: change the header key back to
  `Content-Security-Policy-Report-Only` and redeploy; the policy keeps reporting
  without blocking while you adjust.
