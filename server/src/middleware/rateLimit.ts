import { NextFunction, Request, Response } from 'express';
import { HttpError } from '../lib/http';
import { securityEvent } from '../lib/securityLog';

// Minimal in-memory fixed-window rate limiter (no external dep — the stack can
// solve this). Keyed by client IP; suitable for a single-process dev/prod node.
// For a multi-instance deployment, swap the store for Redis behind this same
// middleware shape.
interface Bucket {
  count: number;
  resetAt: number;
}

// The client IP used as the rate-limit key.
//
// This delegates to `req.ip`, which Express resolves from X-Forwarded-For using
// the `trust proxy` hop count set in app.ts. Do NOT hand-parse the header here:
// picking an entry by position (leftmost or rightmost) cannot be done correctly
// without knowing how many hops the infrastructure adds, and both attempts at
// doing so were wrong in production.
//
// - Reading the LEFTMOST entry let any caller mint a fresh bucket per request,
//   because a proxy appends to whatever the client already sent, leaving the
//   first entry entirely attacker-controlled. That bypass is how ~180 scripted
//   `user_<hex>@example.com` accounts were registered.
// - Reading the RIGHTMOST PUBLIC entry (58088af, since reverted) resolved to the
//   Cloudflare edge address, which rotates per request — so every request got a
//   fresh bucket and NOTHING was limited, for anyone. Worse than the bypass.
//
// With the hop count measured from the deployment's own logs, Express walks the
// chain correctly: it skips exactly the addresses the trusted infrastructure
// appended and returns the first entry it did not vouch for. Prepended junk sits
// to the LEFT of that position, so a forged header no longer changes the key.
//
// Local dev has no proxy and no trust setting, so req.ip is the socket address.
function clientIp(req: Request): string {
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
