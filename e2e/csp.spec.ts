import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import path from 'node:path';

// Content-Security-Policy guard. The CSP is a Vercel-applied response header
// (vercel.json) — it is NOT applied by the local Vite dev server, so a live
// browser CSP check must happen on a Vercel deployment (see docs/CSP.md). What we
// CAN pin here deterministically is the policy's shape: that it is enforcing, that
// the migration corrections stuck (api.siddhatva.in in, onrender.com out), and that
// it never regresses to an unsafe form. This encodes the CSP-Enforcement VERIFY
// checklist so a future edit can't silently loosen or un-enforce the policy.

function loadHeaders(): { key: string; value: string }[] {
  const raw = readFileSync(path.join(__dirname, '..', 'vercel.json'), 'utf8');
  const json = JSON.parse(raw) as { headers: { source: string; headers: { key: string; value: string }[] }[] };
  const rule = json.headers.find((h) => h.source === '/(.*)');
  expect(rule, 'a headers rule for all routes exists').toBeTruthy();
  return rule!.headers;
}

// Split a CSP value into { directive: sources[] }.
function parseCsp(value: string): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const part of value.split(';').map((p) => p.trim()).filter(Boolean)) {
    const [name, ...sources] = part.split(/\s+/);
    out[name] = sources;
  }
  return out;
}

test.describe('Content-Security-Policy (vercel.json)', () => {
  const headers = loadHeaders();
  const cspHeader = headers.find((h) => h.key === 'Content-Security-Policy');
  const directives = cspHeader ? parseCsp(cspHeader.value) : {};

  test('CSP is ENFORCING, not Report-Only', () => {
    expect(cspHeader, 'Content-Security-Policy header is present').toBeTruthy();
    expect(headers.some((h) => h.key === 'Content-Security-Policy-Report-Only')).toBe(false);
  });

  test('the API origin is api.siddhatva.in and the old Render origin is gone', () => {
    expect(directives['connect-src']).toContain('https://api.siddhatva.in');
    expect(cspHeader!.value).not.toContain('onrender.com');
  });

  test('no unsafe primitives: no unsafe-eval, no unsafe-inline in script-src, no bare *', () => {
    expect(cspHeader!.value).not.toContain("'unsafe-eval'");
    expect(directives['script-src']).not.toContain("'unsafe-inline'");
    // A bare "*" source (any host) must never appear; scoped "*.google-analytics.com" is fine.
    expect(cspHeader!.value).not.toMatch(/(^|[\s;])\*([\s;]|$)/);
  });

  test('least-privilege lockdowns are in place', () => {
    expect(directives['default-src']).toEqual(["'self'"]);
    expect(directives['object-src']).toEqual(["'none'"]);
    expect(directives['frame-ancestors']).toEqual(["'none'"]);
    expect(directives['base-uri']).toEqual(["'self'"]);
    expect(directives['form-action']).toEqual(["'self'"]);
    expect(cspHeader!.value).toContain('upgrade-insecure-requests');
  });

  test('every legitimate production origin is allowed', () => {
    // Scripts: Razorpay checkout + GA4 loader (self is implicit for the bundle).
    expect(directives['script-src']).toEqual(
      expect.arrayContaining(["'self'", 'https://checkout.razorpay.com', 'https://www.googletagmanager.com'])
    );
    // Fonts (Google Fonts) + styles.
    expect(directives['style-src']).toEqual(expect.arrayContaining(["'self'", 'https://fonts.googleapis.com']));
    expect(directives['font-src']).toEqual(expect.arrayContaining(["'self'", 'https://fonts.gstatic.com']));
    // Images: Cloudinary (live products) + seed imagery.
    expect(directives['img-src']).toEqual(
      expect.arrayContaining(["'self'", 'https://res.cloudinary.com', 'https://lh3.googleusercontent.com'])
    );
    // Connect: API, Cloudinary upload, Razorpay, GA4 (regional wildcards).
    expect(directives['connect-src']).toEqual(
      expect.arrayContaining([
        "'self'",
        'https://api.siddhatva.in',
        'https://api.cloudinary.com',
        'https://api.razorpay.com',
        'https://lumberjack.razorpay.com',
        'https://*.google-analytics.com',
        'https://*.analytics.google.com',
        'https://www.googletagmanager.com',
      ])
    );
    // Razorpay payment iframe.
    expect(directives['frame-src']).toEqual(
      expect.arrayContaining(['https://api.razorpay.com', 'https://checkout.razorpay.com'])
    );
  });

  test('the complementary security headers are still present', () => {
    const byKey = Object.fromEntries(headers.map((h) => [h.key, h.value]));
    expect(byKey['X-Frame-Options']).toBe('DENY');
    expect(byKey['X-Content-Type-Options']).toBe('nosniff');
    expect(byKey['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    expect(byKey['Strict-Transport-Security']).toContain('max-age=');
  });
});
