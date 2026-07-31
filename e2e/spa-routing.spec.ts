import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import path from 'node:path';

// SPA deep-route guard.
//
// THE BUG THIS EXISTS FOR: this is a client-routed React Router SPA, so /index.html
// is the only HTML file on disk. Vercel had no SPA fallback, so a DIRECT request for
// any deep route (/shop, /privacy, …) never reached React Router — Vercel looked for a
// matching file, found none, and returned its own 404 (x-vercel-error: NOT_FOUND).
// The app only appeared to work because landing on / and CLICKING is client-side
// routing that never goes back to the server. Refreshes, shared links, crawlers, and
// Razorpay's policy-page validator all issue direct requests, and all 404'd.
//
// Why the existing suite missed it: every other spec navigates by clicking (see
// footer-compliance.spec.ts), which is exactly the path that cannot fail this way.
// These tests use page.goto(), which performs a real document request per URL.
//
// HONEST SCOPE — read before trusting a green run:
//   * The runtime tests below prove the APP-LEVEL expectation: a fresh document
//     request for each route renders that route. Against the local Vite dev server
//     they pass even with the bug present, because Vite has its own built-in SPA
//     fallback (`appType: 'spa'`). The bug is Vercel-side and does NOT reproduce on
//     localhost.
//   * To actually exercise the deployment, point them at one:
//         SPA_BASE_URL=https://siddhatva.in npx playwright test e2e/spa-routing.spec.ts
//     That is how this spec was proven RED — every deep route returned 404 against
//     production before the vercel.json rewrite, and 200 after it.
//   * The config test at the bottom is the part that fails deterministically in CI if
//     the fallback is removed. Same approach as csp.spec.ts, which has the identical
//     "Vercel applies it, localhost can't see it" problem.

// Optional absolute origin (e.g. https://siddhatva.in) to run against a real
// deployment. Empty → relative paths resolve against playwright.config.ts baseURL.
const BASE = process.env.SPA_BASE_URL?.replace(/\/$/, '') ?? '';

// Routes that must survive a direct request. Heading = proof React Router resolved
// the URL and the right page mounted (not a generic shell or an error page).
const DEEP_ROUTES = [
  { path: '/shop', heading: 'All Collections' },
  { path: '/shop/Men', heading: 'All Collections' },
  { path: '/search?q=test', heading: /Results for/ },
  { path: '/privacy', heading: 'Privacy Policy' },
  { path: '/terms', heading: 'Terms & Conditions' },
  { path: '/refund-policy', heading: 'Cancellation & Refund Policy' },
  { path: '/shipping-policy', heading: 'Shipping Policy' },
  { path: '/pricing-policy', heading: 'Pricing Policy' },
  { path: '/contact', heading: 'Contact Us' },
];

test.describe('direct deep-route loads (no client-side navigation)', () => {
  for (const route of DEEP_ROUTES) {
    test(`GET ${route.path} serves the app, not a 404`, async ({ page }) => {
      // A real navigation → a fresh document request for this exact URL. This is
      // the request Vercel used to answer with NOT_FOUND.
      const response = await page.goto(`${BASE}${route.path}`);

      // 1. The server returned the document, not a 404.
      expect(response, 'navigation produced a response').toBeTruthy();
      expect(
        response!.status(),
        `${route.path} must serve index.html (200), not a Vercel 404`
      ).toBe(200);

      // 2. The response is the HTML app shell.
      expect(response!.headers()['content-type']).toContain('text/html');

      // 3. The router took over and mounted THIS route — not just any page.
      await expect(
        page.getByRole('heading', { level: 1, name: route.heading }),
        `${route.path} rendered its own <h1>`
      ).toBeVisible({ timeout: 15_000 });

      // 4. The full app shell mounted (chrome, not a bare error document).
      await expect(page.getByRole('contentinfo')).toBeAttached();

      // 5. The URL was preserved — a rewrite must not redirect the user to /.
      expect(new URL(page.url()).pathname + new URL(page.url()).search).toBe(route.path);
    });
  }

  test('/ still serves the app (control — this never broke)', async ({ page }) => {
    const response = await page.goto(`${BASE}/`);
    expect(response!.status()).toBe(200);
    await expect(page.getByRole('contentinfo')).toBeAttached();
  });
});

// The deterministic half: assert the Vercel SPA fallback is configured. This is what
// actually fails in CI if someone drops the rewrite, since the runtime tests above
// pass on localhost either way.
test.describe('Vercel SPA fallback (vercel.json)', () => {
  const json = JSON.parse(
    readFileSync(path.join(__dirname, '..', 'vercel.json'), 'utf8')
  ) as {
    routes?: unknown;
    rewrites?: { source: string; destination: string }[];
    headers?: unknown[];
  };

  test('a catch-all rewrite sends unmatched paths to /index.html', () => {
    expect(json.rewrites, 'vercel.json defines rewrites').toBeTruthy();
    const fallback = json.rewrites!.find((r) => r.destination === '/index.html');
    expect(fallback, 'a rewrite targets /index.html').toBeTruthy();
    // Must be a catch-all, not a hand-listed set of routes that new pages would miss.
    expect(fallback!.source).toContain('.*');
  });

  test('the fallback does not shadow build assets or the API', () => {
    const fallback = json.rewrites?.find((r) => r.destination === '/index.html');
    expect(fallback, 'a rewrite targets /index.html').toBeTruthy();
    // Negative lookahead keeps hashed chunks and any API path out of the rewrite, so
    // a stale chunk 404s cleanly instead of returning HTML with a JS content-type.
    expect(fallback!.source).toContain('(?!');
    expect(fallback!.source).toContain('assets/');
    expect(fallback!.source).toContain('api/');
  });

  test('rewrites coexist with headers — the legacy "routes" key is not used', () => {
    // Vercel rejects a config that mixes `routes` with `rewrites`/`headers`. If that
    // ever happens the deploy fails and the CSP goes with it.
    expect(json.routes, 'vercel.json must not use the legacy routes key').toBeUndefined();
    expect(Array.isArray(json.headers), 'the security headers are still defined').toBe(true);
  });
});
