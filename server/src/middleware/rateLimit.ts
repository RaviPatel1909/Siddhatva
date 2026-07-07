import { NextFunction, Request, Response } from 'express';
import { HttpError } from '../lib/http';

// Minimal in-memory fixed-window rate limiter (no external dep — the stack can
// solve this). Keyed by client IP; suitable for a single-process dev/prod node.
// For a multi-instance deployment, swap the store for Redis behind this same
// middleware shape.
interface Bucket {
  count: number;
  resetAt: number;
}

export function rateLimit(opts: { windowMs: number; max: number; name?: string }) {
  const buckets = new Map<string, Bucket>();

  return (req: Request, _res: Response, next: NextFunction): void => {
    const key = `${opts.name ?? 'rl'}:${req.ip ?? 'unknown'}`;
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
