// Structured security / audit logging. One consistent, greppable, parseable shape
// for security-sensitive events so a log aggregator (or a human running
// `grep '\[security\]'`) can review them. Written to stderr (console.warn) so the
// events survive stdout buffering and stand apart from morgan's request log.
//
// PRIVACY / SECRECY RULES (enforced by convention at every call site):
//   - NEVER log passwords, JWTs/refresh tokens, signatures, or payment/card data.
//   - Account identifiers (email / userId) and the client IP MAY be logged — they
//     are the minimum needed to make an event actionable (spotting brute-force,
//     targeted accounts, or token theft) and are not secrets.

export type SecurityEvent =
  | 'auth.login_failed' // bad credentials at POST /auth/login
  | 'auth.admin_login' // a successful login by an ADMIN account
  | 'auth.password_reset' // a password was changed via the reset flow
  | 'auth.refresh_failed' // a refresh attempt was rejected (missing/invalid/expired)
  | 'auth.refresh_reuse_detected' // a revoked refresh token was replayed → family revoked
  | 'admin.operation' // an admin-only mutating request (POST/PATCH/DELETE)
  | 'payment.verify_failed' // Razorpay payment-signature verification failed
  | 'payment.webhook_signature_invalid' // an inbound webhook failed signature check
  | 'order.validation_failed' // checkout rejected an order (stock/variant/sellability)
  | 'security.rate_limited'; // a rate limiter returned 429

// Emit a security event as a single structured line: `[security] {json}`.
export function securityEvent(event: SecurityEvent, fields: Record<string, unknown> = {}): void {
  // eslint-disable-next-line no-console
  console.warn(`[security] ${JSON.stringify({ event, ...fields, at: new Date().toISOString() })}`);
}
