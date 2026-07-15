import { NextFunction, Request, Response } from 'express';
import { env } from '../env';

// Standard security response headers for the API. Hand-rolled (helmet-equivalent
// for the four headers we need) to avoid pulling a dependency — and the
// cross-platform lockfile churn that a `npm install` in /server would cause — for
// a handful of static headers.
//
// These protect API responses. The headers that protect the *pages* users load
// (the same set + CSP) are set on the frontend by Vercel — see vercel.json.
export function securityHeaders(_req: Request, res: Response, next: NextFunction): void {
  // Block MIME-type sniffing.
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // The API is JSON and is never meant to be framed. DENY here does NOT affect the
  // storefront embedding Razorpay's checkout iframe — X-Frame-Options only governs
  // whether OUR responses may be framed by others, not what our pages embed.
  res.setHeader('X-Frame-Options', 'DENY');
  // Don't leak URLs in the Referer header from API responses.
  res.setHeader('Referrer-Policy', 'no-referrer');
  // HSTS only in production (served over TLS by Render). 180 days, subdomains.
  if (env.isProd) {
    res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
  }
  next();
}
