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

// The client IP used as the rate-limit key: the leftmost X-Forwarded-For entry
// when behind a trusted proxy, else req.ip.
//
// ⚠️ KNOWN WEAKNESS — the leftmost entry is client-controllable.
//
// A proxy APPENDS the address it saw to whatever the client already sent, so the
// header arrives as `<anything the client made up>, <appended by the proxy…>`.
// Reading the leftmost entry therefore lets a caller mint a fresh bucket per
// request by varying the header. Verified against production: with the real IP's
// bucket exhausted and returning 429, a unique spoofed X-Forwarded-For returned a
// fresh 400 every time. This affects EVERY limiter here, and is the likely gap
// behind the flood of scripted signups.
//
// It is nevertheless kept for now, because the obvious fix is worse if guessed.
// Taking the rightmost public entry instead was tried and REVERTED: against the
// real Render deployment it resolved to something appended AFTER the client
// address that is not stable per client, so the limiter stopped limiting anyone
// at all — strictly worse than a bypass that requires deliberate spoofing.
//
// To fix this correctly, the platform's actual forwarded chain has to be known
// rather than assumed. `security.rate_limited` now logs the raw `forwarded`
// chain for exactly that purpose: read one such line from the deployment's logs,
// count the hops, then set Express `trust proxy` to that hop count and key this
// on `req.ip` (which resolves the chain properly once the count is right).
// Guessing the count too high collapses every visitor into a single bucket and
// rate-limits the whole site, so it must be measured, not inferred.
//
// Tracked in the vault's Known Gaps note.
function clientIp(req: Request): string {
  if (env.trustProxy) {
    const xff = req.headers['x-forwarded-for'];
    const raw = Array.isArray(xff) ? xff[0] : xff;
    const first = raw?.split(',')[0]?.trim();
    if (first) return first;
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
