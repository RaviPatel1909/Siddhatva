import 'dotenv/config';

const port = Number(process.env.PORT ?? 4000);

// Allowed browser origins for CORS. CORS_ORIGINS (comma-separated) is the
// configurable list — e.g. "https://your-frontend.app,http://localhost:3000" —
// so deploy URLs are never hardcoded. Falls back to the legacy single
// CORS_ORIGIN, then the local dev frontend. Values are normalized (trimmed,
// trailing slash stripped — an Origin header never has one).
const corsOrigins = (process.env.CORS_ORIGINS ?? process.env.CORS_ORIGIN ?? 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim().replace(/\/+$/, ''))
  .filter(Boolean);

export const env = {
  port,
  corsOrigins,
  isProd: process.env.NODE_ENV === 'production',
  // Behind a proxy/CDN (Vercel/Railway) the real client IP is in X-Forwarded-For,
  // not the socket address. Enable ONLY when actually behind a trusted proxy —
  // otherwise clients could spoof the header. Off in local dev.
  trustProxy: process.env.TRUST_PROXY === 'true' || process.env.TRUST_PROXY === '1',
  // Public origin of this API, used to build local dev image URLs.
  publicUrl: process.env.PUBLIC_URL ?? `http://localhost:${port}`,
  // Public origin of the storefront (frontend), used to build links in emails.
  // Defaults to the first allowed CORS origin (the storefront).
  appUrl: process.env.APP_URL ?? corsOrigins[0] ?? 'http://localhost:3000',

  // Auth. Secrets MUST be set in production; the dev fallbacks are obvious.
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET ?? 'dev-only-access-secret-change-me',
  accessTtlSeconds: Number(process.env.ACCESS_TTL_SECONDS ?? 15 * 60), // 15 minutes
  refreshTtlDays: Number(process.env.REFRESH_TTL_DAYS ?? 7),

  // Cloudinary. When all three are set the real image store is used; otherwise
  // the app falls back to a local dev image store (see lib/imageStore.ts).
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME ?? '',
    apiKey: process.env.CLOUDINARY_API_KEY ?? '',
    apiSecret: process.env.CLOUDINARY_API_SECRET ?? '',
  },

  // Razorpay (test mode). When key id + secret are set the real gateway is used;
  // otherwise payments run in mock mode (see lib/payments.ts). Only keyId is ever
  // sent to the browser.
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID ?? '',
    keySecret: process.env.RAZORPAY_KEY_SECRET ?? '',
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET ?? '',
  },

  // Resend (transactional email). When RESEND_API_KEY is set the real Resend
  // service is used; otherwise emails are rendered to the console + a local file
  // (dev fallback, see lib/email/*). The API key is server-side only.
  // `from` MUST be a domain you've verified in Resend (SPF/DKIM) — see RESEND.md.
  resend: {
    apiKey: process.env.RESEND_API_KEY ?? '',
    from: process.env.EMAIL_FROM ?? 'Siddhatva <onboarding@resend.dev>',
  },

  // Shiprocket (logistics). When email + password (or an API token) are set the
  // real provider is used; otherwise shipments run in mock mode (see
  // lib/shipping/*). Credentials + webhook token are server-side only. Zero code
  // change to activate. See SHIPROCKET.md.
  shiprocket: {
    email: process.env.SHIPROCKET_EMAIL ?? '',
    password: process.env.SHIPROCKET_PASSWORD ?? '',
    channelId: process.env.SHIPROCKET_CHANNEL_ID ?? '',
    pickupLocation: process.env.SHIPROCKET_PICKUP_LOCATION ?? 'Primary',
    // Verifies inbound tracking webhooks via the x-api-key header Shiprocket sends.
    webhookToken: process.env.SHIPROCKET_WEBHOOK_TOKEN ?? '',
  },
};
