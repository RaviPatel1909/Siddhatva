import { NextFunction, Request, Response } from 'express';
import { HttpError } from '../lib/http';
import { env } from '../env';
import { securityEvent } from '../lib/securityLog';

// Minimal in-memory fixed-window rate limiter (no external dep — the stack can
// solve this). Keyed by client IP; suitable for a single-process dev/prod node.
// For a multi-instance deployment, swap the store for Redis behind this same
// middleware shape.
interface Bucket {
  count: number;
  resetAt: number;
}

// Private / loopback / link-local ranges. Addresses a platform adds for its own
// internal hops — never a real client.
const PRIVATE_IP =
  /^(10\.|127\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1$|f[cd][0-9a-f]{2}:|fe80:)/i;

// The real client IP, used as the rate-limit key.
//
// SECURITY: this deliberately reads the RIGHTMOST public entry of
// X-Forwarded-For, not the leftmost. A proxy APPENDS the address it saw to
// whatever the client sent, so the header arrives as:
//
//     <anything the client made up> , <real client IP> [, <internal hops>]
//
// The leftmost entry is therefore fully attacker-controlled. Reading it (as this
// did) let a caller mint a fresh rate-limit bucket per request just by varying
// the header — verified against production: with the real IP's bucket exhausted
// and returning 429, a unique spoofed X-Forwarded-For returned 200-path
// responses every time. That bypass applied to EVERY limiter here (login,
// register, checkout, password reset, and the global /api backstop), and is the
// gap behind the flood of scripted signups.
//
// Walking from the right and skipping private addresses is robust without
// needing to know how many hops the platform adds (a fixed hop count guessed
// wrong collapses every visitor into one bucket and rate-limits the whole site).
// An attacker can only PREPEND, so nothing they inject can appear to the right
// of the address the trusted proxy appended.
function clientIp(req: Request): string {
  if (env.trustProxy) {
    const xff = req.headers['x-forwarded-for'];
    const raw = Array.isArray(xff) ? xff.join(',') : xff;
    const chain = (raw ?? '')
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);
    for (let i = chain.length - 1; i >= 0; i -= 1) {
      if (!PRIVATE_IP.test(chain[i])) return chain[i];
    }
  }
  return req.ip ?? req.socket.remoteAddress ?? 'unknown';
}

export function rateLimit(opts: { windowMs: number; max: number; name?: string }) {
  const buckets = new Map<string, Bucket>();

  return (req: Request, _res: Response, next: NextFunction): void => {
    const key = `${opts.name ?? 'rl'}:${clientIp(req)}`;
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || now >= bucket.resetAt) {
      buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
      next();
      return;
    }
    if (bucket.count >= opts.max) {
      // `forwarded` records the chain the resolved ip was picked from, so the
      // platform's actual hop shape is readable straight from the logs (and any
      // spoof attempt is visible as extra leading entries).
      const xff = req.headers['x-forwarded-for'];
      securityEvent('security.rate_limited', {
        limiter: opts.name ?? 'rl',
        ip: clientIp(req),
        forwarded: (Array.isArray(xff) ? xff.join(',') : xff) ?? null,
      });
      next(new HttpError(429, 'Too many requests — please try again later'));
      return;
    }
    bucket.count += 1;
    next();
  };
}
