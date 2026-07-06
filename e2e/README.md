# End-to-end tests

Playwright suite covering critical, cross-cutting flows. Currently:

- **`auth-isolation.spec.ts`** — cross-account data isolation. Guards the class
  of bug fixed in `ad502fe` (one account's wishlist leaking into the next
  account to log in). Asserts a fresh account sees none of another account's
  wishlist/orders, and that guest items enter an account only through the
  intended explicit merge and never leak onward.

## Prerequisites

These tests run against the real stack with a **seeded database**:

```bash
cd server && npm run db      # embedded Postgres on :5432 (keep running)
cd server && npm run seed    # admin + customer (customer has wishlist + orders)
```

The frontend (`:3000`) and API (`:4000`) are started automatically by the
Playwright config (or reused if already running). `global-setup.ts` fails fast
with a clear message if the API/database isn't reachable or seeded.

## Run

```bash
npm run test:e2e             # headless
npm run test:e2e -- --headed # watch it drive the browser
```

Browsers install to the shared Playwright cache; if missing, run
`npx playwright install chromium`.
