import { NextFunction, Request, Response } from 'express';
import { HttpError } from '../lib/http';
import { env } from '../env';

// Minimal in-memory fixed-window rate limiter (no external dep — the stack can
// solve this). Keyed by client IP; suitable for a single-process dev/prod node.
// For a multi-instance deployment, swap the store for Redis behind this same
// middleware shape.
interface Bucket {
  count: number;
  resetAt: number;
}

// The real client IP. Behind a trusted proxy/CDN, req.ip / req.socket are the
// proxy's address (so limits would be global, not per-user) — so read the
// original client from X-Forwarded-For (leftmost entry = the client Vercel/
// Railway saw). Only trusted when env.trustProxy is set; otherwise the header is
// spoofable, so we fall back to req.ip.
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
      next(new HttpError(429, 'Too many requests — please try again later'));
      return;
    }
    bucket.count += 1;
    next();
  };
}
