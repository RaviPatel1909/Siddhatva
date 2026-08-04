import crypto from 'node:crypto';
import { prisma } from '../prisma';
import { hashToken } from './tokens';
import { env } from '../env';

// Longer-lived than a password reset (1h). A reset is a deliberate, immediate
// action; a verification mail may sit unread for a while, and an expired link is
// pure friction for a legitimate signup. Still bounded, and still single-use.
export const VERIFICATION_TTL_MINUTES = 24 * 60; // 24h

// Dev-only capture of raw verification tokens (never populated in production),
// so the dev peek endpoint + e2e can retrieve the token the user would receive
// by email without weakening the real flow. Mirrors passwordReset.ts exactly.
const devVerificationTokens = new Map<string, string>();

// Create a single-use verification token for a user. Stores only the sha256
// HASH; the raw token is returned to be emailed (and, in dev only, stashed).
export async function createEmailVerificationToken(userId: string, email: string): Promise<string> {
  const raw = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(raw);
  const expiresAt = new Date(Date.now() + VERIFICATION_TTL_MINUTES * 60 * 1000);
  // Invalidate any outstanding tokens for this user first, so a resend makes
  // earlier links dead rather than leaving several valid at once.
  await prisma.$transaction([
    prisma.emailVerificationToken.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() },
    }),
    prisma.emailVerificationToken.create({ data: { userId, tokenHash, expiresAt } }),
  ]);
  if (!env.isProd) devVerificationTokens.set(email.toLowerCase(), raw);
  return raw;
}

export function verificationLink(rawToken: string): string {
  return `${env.appUrl}/verify-email?token=${encodeURIComponent(rawToken)}`;
}

// Dev-only: retrieve the most recent raw token issued for an email.
export function peekDevVerificationToken(email: string): string | undefined {
  return devVerificationTokens.get(email.toLowerCase());
}
