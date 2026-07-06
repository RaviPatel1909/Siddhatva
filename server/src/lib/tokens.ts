import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../env';

export type Role = 'CUSTOMER' | 'ADMIN';
export interface AccessPayload {
  sub: string;
  role: Role;
}

// Short-lived access token (JWT). Payload carries the role so requireAdmin can
// gate without a DB hit; subject is the user id.
export function signAccessToken(userId: string, role: Role): string {
  return jwt.sign({ role }, env.jwtAccessSecret, {
    subject: userId,
    expiresIn: env.accessTtlSeconds,
  });
}

export function verifyAccessToken(token: string): AccessPayload {
  const decoded = jwt.verify(token, env.jwtAccessSecret) as jwt.JwtPayload;
  return { sub: String(decoded.sub), role: decoded.role as Role };
}

// Refresh tokens are opaque random strings; only their sha256 hash is stored,
// so a database leak can't be used to mint sessions.
export function generateRefreshToken(): { token: string; tokenHash: string } {
  const token = crypto.randomBytes(48).toString('hex');
  return { token, tokenHash: hashToken(token) };
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function refreshExpiry(): Date {
  return new Date(Date.now() + env.refreshTtlDays * 24 * 60 * 60 * 1000);
}
