import { NextFunction, Request, Response } from 'express';
import { HttpError } from '../lib/http';
import { verifyAccessToken } from '../lib/tokens';

// Verifies the Bearer access token and attaches req.user. 401 when missing or
// invalid/expired (the client's fetch wrapper then tries a refresh).
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    next(new HttpError(401, 'Authentication required'));
    return;
  }
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    next(new HttpError(401, 'Invalid or expired token'));
  }
}

// Gates admin-only routes. 401 if unauthenticated, 403 if the wrong role — must
// run after requireAuth.
export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    next(new HttpError(401, 'Authentication required'));
    return;
  }
  if (req.user.role !== 'ADMIN') {
    next(new HttpError(403, 'Admin access required'));
    return;
  }
  next();
}
