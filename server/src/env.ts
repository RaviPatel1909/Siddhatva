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

// ============================================================================
// PROXY HOP COUNT — measured against the real deployment, never guessed.
//
// TRUST_PROXY turns proxy awareness on; TRUST_PROXY_HOPS says how many hops to
// trust. They are separate vars deliberately: TRUST_PROXY=1 has always meant
// "true", so overloading it with a count would silently mean "1 hop" on the
// existing production config.
//
// The count is what Express `trust proxy` takes, and it counts the SOCKET as a
// hop as well as each X-Forwarded-For entry the infrastructure appended. The
// production chain, read from a real `security.rate_limited` log line, is:
//
//     X-Forwarded-For: <client>, <Cloudflare edge>, <Render internal>
//     socket:          <Render router>
//
// so three addresses in front of the client => 3. Verified by resolving req.ip
// against that exact chain: 3 returns the client both with and without forged
// entries prepended, while 2 returns the CLOUDFLARE EDGE — which rotates per
// request (172.69.94.230, 162.158.227.142, 104.23.197.11 across five
// consecutive requests from ONE client). That rotation is what made the
// reverted "rightmost public entry" fix stop limiting anybody at all.
//
// Set too LOW and every request keys on a rotating address => nothing is ever
// limited. Set too HIGH and the count reaches back into entries the client
// supplied => the spoofing bypass returns. Re-measure from the logs if the
// infrastructure in front of this server ever changes; TRUST_PROXY_HOPS exists
// so that correction is an env change on the host, not a code redeploy.
// ============================================================================
const MEASURED_TRUST_PROXY_HOPS = 3;

const trustProxy = process.env.TRUST_PROXY === 'true' || process.env.TRUST_PROXY === '1';
const configuredHops = Number(process.env.TRUST_PROXY_HOPS);
const trustProxyHops = trustProxy
  ? Number.isInteger(configuredHops) && configuredHops > 0
    ? configuredHops
    : MEASURED_TRUST_PROXY_HOPS
  : 0;

// ============================================================================
// EMAIL VERIFICATION ENFORCEMENT — off unless explicitly switched on.
//
// When OFF (the default, and the state this ships in): verification emails are
// still sent and /auth/verify-email still works, but an unverified user can log
// in exactly as before. Deploying this feature therefore changes NO login
// behaviour — the flow can be exercised in production before it gates anyone.
//
// When ON: unverified users are refused at login. That is only safe once mail is
// confirmed to be ARRIVING — the vault records Resend currently landing in spam
// on a warming domain, and enforcing before that is fixed would lock out real
// customers with no way through. Flip this only after sending yourself a real
// verification mail and finding it.
//
// Admins are grandfathered as verified by the email_verification migration, so
// this flag cannot cost anyone the admin panel.
// ============================================================================
const requireEmailVerification =
  process.env.REQUIRE_EMAIL_VERIFICATION === 'true' ||
  process.env.REQUIRE_EMAIL_VERIFICATION === '1';

// The obvious dev-only JWT signing secret. Fine for localhost; a production boot
// with this value (or none) is refused by assertProductionSecrets() below, because
// it's public in the repo and access tokens carry the admin role.
const DEV_JWT_FALLBACK = 'dev-only-access-secret-change-me';

export const env = {
  port,
  corsOrigins,
  isProd: process.env.NODE_ENV === 'production',
  // Behind a proxy/CDN the real client IP is in X-Forwarded-For, not the socket
  // address. Enable ONLY when actually behind a trusted proxy — otherwise clients
  // could spoof the header. Off in local dev.
  trustProxy,
  // How many proxy hops sit in front of this server, passed straight to Express
  // `trust proxy`. See TRUST_PROXY_HOPS above — this number is MEASURED, and
  // getting it wrong breaks rate limiting in one direction or the other.
  trustProxyHops,
  // Whether an unverified email address blocks login. Default OFF — see the
  // block above; this is the rollout safety valve, not a feature toggle to
  // leave on by accident.
  requireEmailVerification,
  // Public origin of this API, used to build local dev image URLs.
  publicUrl: process.env.PUBLIC_URL ?? `http://localhost:${port}`,
  // Public origin of the storefront (frontend), used to build links in emails.
  // Defaults to the first allowed CORS origin (the storefront).
  appUrl: process.env.APP_URL ?? corsOrigins[0] ?? 'http://localhost:3000',

  // Auth. Secrets MUST be set in production; the dev fallback is obvious and is
  // enforced by assertProductionSecrets() (called at boot in index.ts).
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET ?? DEV_JWT_FALLBACK,
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

// ============================================================================
// PRODUCTION SECRET GUARD — access tokens are JWTs that carry the user's role,
// and requireAdmin trusts that claim without a DB check. So if the signing secret
// is missing, the public dev fallback, or trivially short in production, ANYONE
// could forge a `role: ADMIN` token and bypass every /admin/* gate. Refuse to
// boot rather than run wide open. (Refresh tokens need no guard here — they are
// random 48-byte strings stored hashed, not signed with a secret.)
//
// Same shape as the seed / embedded-DB guards: called explicitly at startup
// (index.ts), only bites under NODE_ENV=production, dev stays untouched.
// ============================================================================
const MIN_SECRET_LENGTH = 32;

export function assertProductionSecrets(): void {
  if (!env.isProd) return;

  const secret = process.env.JWT_ACCESS_SECRET;
  let problem: string | null = null;
  if (!secret) {
    problem = 'JWT_ACCESS_SECRET is not set.';
  } else if (secret === DEV_JWT_FALLBACK) {
    problem = 'JWT_ACCESS_SECRET is still the public dev fallback value.';
  } else if (secret.length < MIN_SECRET_LENGTH) {
    problem = `JWT_ACCESS_SECRET is too short (${secret.length} chars; need at least ${MIN_SECRET_LENGTH}).`;
  }

  if (problem) {
    // eslint-disable-next-line no-console
    console.error(
      'Refusing to start: insecure JWT signing secret in production.\n' +
        `  - ${problem}\n` +
        'Access tokens carry the admin role and are trusted by requireAdmin, so a ' +
        'weak or repo-visible secret lets anyone forge an admin session. Set a strong, ' +
        'random JWT_ACCESS_SECRET (e.g. `openssl rand -hex 32`) in the environment and redeploy.'
    );
    process.exit(1);
  }
}
