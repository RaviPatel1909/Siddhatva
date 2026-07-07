import crypto from 'node:crypto';
import { prisma } from '../prisma';
import { hashToken } from './tokens';
import { env } from '../env';

export const RESET_TTL_MINUTES = 60; // short-lived (1h)

// Dev-only capture of raw reset tokens (never populated in production), so the
// dev peek endpoint + e2e can retrieve the token the user would get by email
// without weakening the real flow (mirrors the pay-mock dev hook).
const devResetTokens = new Map<string, string>();

// Create a single-use reset token for a user. Stores only the sha256 HASH; the
// raw token is returned to be emailed (and, in dev only, stashed for the peek).
export async function createPasswordResetToken(userId: string, email: string): Promise<string> {
  const raw = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(raw);
  const expiresAt = new Date(Date.now() + RESET_TTL_MINUTES * 60 * 1000);
  await prisma.passwordResetToken.create({ data: { userId, tokenHash, expiresAt } });
  if (!env.isProd) devResetTokens.set(email.toLowerCase(), raw);
  return raw;
}

export function resetLink(rawToken: string): string {
  return `${env.appUrl}/reset-password?token=${encodeURIComponent(rawToken)}`;
}

// Dev-only: retrieve the most recent raw token issued for an email.
export function peekDevResetToken(email: string): string | undefined {
  return devResetTokens.get(email.toLowerCase());
}
