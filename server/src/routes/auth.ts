import { Response, Router } from 'express';
import { prisma } from '../prisma';
import { asyncHandler, HttpError } from '../lib/http';
import { requireAuth } from '../middleware/auth';
import { rateLimit } from '../middleware/rateLimit';
import {
  forgotPasswordBody,
  loginBody,
  registerBody,
  resendVerificationBody,
  resetPasswordBody,
  verifyEmailBody,
} from '../schemas';
import { hashPassword, verifyPassword } from '../lib/password';
import {
  generateRefreshToken,
  hashToken,
  refreshExpiry,
  Role,
  signAccessToken,
} from '../lib/tokens';
import {
  createPasswordResetToken,
  peekDevResetToken,
  resetLink,
  RESET_TTL_MINUTES,
} from '../lib/passwordReset';
import {
  createEmailVerificationToken,
  peekDevVerificationToken,
  verificationLink,
  VERIFICATION_TTL_MINUTES,
} from '../lib/emailVerification';
import { emailService } from '../lib/email/service';
import { renderPasswordReset, renderVerifyEmail } from '../emails/render';
import { env } from '../env';
import { securityEvent } from '../lib/securityLog';

export const authRouter = Router();

const REFRESH_COOKIE = 'refreshToken';

type PublicUser = { id: string; email: string; name: string; role: Role };
const toPublicUser = (u: { id: string; email: string; name: string; role: string }): PublicUser => ({
  id: u.id,
  email: u.email,
  name: u.name,
  role: u.role as Role,
});

function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: env.isProd,
    sameSite: env.isProd ? 'none' : 'lax',
    path: '/api/auth',
    maxAge: env.refreshTtlDays * 24 * 60 * 60 * 1000,
  });
}

function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' });
}

// Machine-readable discriminator for the one login failure the client renders
// differently (a dedicated "confirm your email" screen rather than the generic
// credentials error). Kept as a constant so route and contract can't drift.
export const EMAIL_NOT_VERIFIED = 'EMAIL_NOT_VERIFIED';

// Issue + send a verification email. Never throws: a mail failure must not fail
// the request it is attached to (registration would 500 on a mail outage, and
// resend would leak account existence through differing behaviour).
async function sendVerificationEmail(user: { id: string; email: string; name: string }): Promise<void> {
  try {
    const raw = await createEmailVerificationToken(user.id, user.email);
    const rendered = await renderVerifyEmail({
      name: user.name,
      verifyUrl: verificationLink(raw),
      expiresInMinutes: VERIFICATION_TTL_MINUTES,
    });
    await emailService.send({ to: user.email, email: rendered });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[auth] failed to send verification email', err);
  }
}

// Issue an access token and a rotating refresh token (stored hashed), setting
// the httpOnly refresh cookie. Returns the access token for the JSON body.
async function issueSession(res: Response, user: { id: string; role: Role }): Promise<string> {
  const accessToken = signAccessToken(user.id, user.role);
  const { token, tokenHash } = generateRefreshToken();
  await prisma.refreshToken.create({
    data: { tokenHash, userId: user.id, expiresAt: refreshExpiry() },
  });
  setRefreshCookie(res, token);
  return accessToken;
}

// POST /auth/register
authRouter.post(
  '/register',
  // Cap account-creation abuse per IP. Loose enough for real signups (and the
  // e2e suite, which registers a few accounts from one IP per run).
  rateLimit({ windowMs: 15 * 60 * 1000, max: 20, name: 'register' }),
  asyncHandler(async (req, res) => {
    const { email, name, password } = registerBody.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new HttpError(409, 'An account with that email already exists');

    const user = await prisma.user.create({
      data: { email, name, password: await hashPassword(password), role: 'CUSTOMER' },
    });
    await sendVerificationEmail(user);

    // When enforcement is ON, registration must NOT hand back a session —
    // otherwise signup would silently grant the very access login refuses, and
    // the gate would be trivially sidestepped by registering. When OFF, this is
    // byte-for-byte the previous behaviour (auto sign-in), which is what keeps
    // deploying this change inert until the flag is flipped.
    if (env.requireEmailVerification) {
      res.status(201).json({ user: toPublicUser(user), verificationRequired: true });
      return;
    }
    const accessToken = await issueSession(res, { id: user.id, role: 'CUSTOMER' });
    res.status(201).json({ user: toPublicUser(user), accessToken, verificationRequired: false });
  })
);

// POST /auth/login
authRouter.post(
  '/login',
  // Brute-force / credential-stuffing backstop per IP. Admin logs in here too.
  // bcrypt already makes online guessing slow; this caps it hard. Headroom kept
  // above the e2e suite's many logins-from-one-IP so it stays green (not flaky).
  rateLimit({ windowMs: 15 * 60 * 1000, max: 50, name: 'login' }),
  asyncHandler(async (req, res) => {
    const { email, password } = loginBody.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await verifyPassword(password, user.password))) {
      securityEvent('auth.login_failed', { email, ip: req.ip });
      throw new HttpError(401, 'Invalid email or password');
    }

    // Verification is checked AFTER the password, deliberately. Reaching this
    // point already required the correct credentials, so telling this caller
    // that the address is unverified reveals nothing they didn't prove they
    // knew — no enumeration. Checking it first would turn login into an
    // account-existence oracle for anyone with a wordlist.
    //
    // Admins are grandfathered verified by the email_verification migration, so
    // this cannot lock the admin panel.
    if (env.requireEmailVerification && !user.emailVerifiedAt) {
      securityEvent('auth.login_blocked_unverified', { userId: user.id, ip: req.ip });
      throw new HttpError(
        403,
        'Please confirm your email address before signing in.',
        EMAIL_NOT_VERIFIED
      );
    }

    const accessToken = await issueSession(res, { id: user.id, role: user.role as Role });
    // Admin sign-ins are audit-worthy (privileged access); customer logins are not.
    if (user.role === 'ADMIN') securityEvent('auth.admin_login', { userId: user.id, ip: req.ip });
    res.json({ user: toPublicUser(user), accessToken });
  })
);

// POST /auth/refresh — rotate the refresh token and mint a new access token.
authRouter.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const raw = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    if (!raw) {
      securityEvent('auth.refresh_failed', { ip: req.ip, reason: 'missing' });
      throw new HttpError(401, 'Missing refresh token');
    }

    const tokenHash = hashToken(raw);
    const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });
    if (!stored) {
      securityEvent('auth.refresh_failed', { ip: req.ip, reason: 'unknown_token' });
      clearRefreshCookie(res);
      throw new HttpError(401, 'Invalid refresh token');
    }
    // Reuse of an already-rotated token → likely theft; revoke the whole family.
    if (stored.revokedAt) {
      securityEvent('auth.refresh_reuse_detected', { userId: stored.userId, ip: req.ip });
      await prisma.refreshToken.updateMany({
        where: { userId: stored.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      clearRefreshCookie(res);
      throw new HttpError(401, 'Refresh token already used');
    }
    if (stored.expiresAt < new Date()) {
      securityEvent('auth.refresh_failed', { userId: stored.userId, ip: req.ip, reason: 'expired' });
      clearRefreshCookie(res);
      throw new HttpError(401, 'Refresh token expired');
    }

    const user = await prisma.user.findUnique({ where: { id: stored.userId } });
    if (!user) {
      securityEvent('auth.refresh_failed', { userId: stored.userId, ip: req.ip, reason: 'user_gone' });
      clearRefreshCookie(res);
      throw new HttpError(401, 'Invalid refresh token');
    }

    // Rotate: revoke the presented token, issue a fresh pair.
    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });
    const accessToken = await issueSession(res, { id: user.id, role: user.role as Role });
    res.json({ user: toPublicUser(user), accessToken });
  })
);

// POST /auth/logout — revoke the current refresh token and clear the cookie.
authRouter.post(
  '/logout',
  asyncHandler(async (req, res) => {
    const raw = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    if (raw) {
      await prisma.refreshToken.updateMany({
        where: { tokenHash: hashToken(raw), revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    clearRefreshCookie(res);
    res.json({ ok: true });
  })
);

// POST /auth/forgot-password — start a reset. ALWAYS returns the same success
// response whether or not the email exists (no account enumeration). Rate-limited.
authRouter.post(
  '/forgot-password',
  rateLimit({ windowMs: 15 * 60 * 1000, max: 20, name: 'forgot-password' }),
  asyncHandler(async (req, res) => {
    const { email } = forgotPasswordBody.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      try {
        const raw = await createPasswordResetToken(user.id, user.email);
        const rendered = await renderPasswordReset({
          name: user.name,
          resetUrl: resetLink(raw),
          expiresInMinutes: RESET_TTL_MINUTES,
        });
        await emailService.send({ to: user.email, email: rendered });
      } catch (err) {
        // Never surface a failure to the caller (would leak existence/timing).
        // eslint-disable-next-line no-console
        console.error('[auth] failed to send password reset email', err);
      }
    }
    res.json({ ok: true, message: 'If an account exists for that email, a reset link has been sent.' });
  })
);

// POST /auth/reset-password — validate a single-use token and set the new
// password, then REVOKE all refresh tokens (force re-login everywhere).
authRouter.post(
  '/reset-password',
  rateLimit({ windowMs: 15 * 60 * 1000, max: 30, name: 'reset-password' }),
  asyncHandler(async (req, res) => {
    const { token, newPassword } = resetPasswordBody.parse(req.body);
    const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashToken(token) } });
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new HttpError(400, 'This reset link is invalid or has expired');
    }
    const passwordHash = await hashPassword(newPassword);
    await prisma.$transaction([
      prisma.user.update({ where: { id: record.userId }, data: { password: passwordHash } }),
      prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
      // Reuse the Phase 4 revocation path: kill every active refresh token so all
      // existing sessions are logged out after a reset.
      prisma.refreshToken.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
    securityEvent('auth.password_reset', { userId: record.userId });
    clearRefreshCookie(res);
    res.json({ ok: true });
  })
);

// POST /auth/verify-email — consume a single-use verification token.
// Idempotent-ish by design: a token can only be spent once, but verifying an
// already-verified account via a fresh token is harmless and still 200s.
authRouter.post(
  '/verify-email',
  rateLimit({ windowMs: 15 * 60 * 1000, max: 30, name: 'verify-email' }),
  asyncHandler(async (req, res) => {
    const { token } = verifyEmailBody.parse(req.body);
    const record = await prisma.emailVerificationToken.findUnique({
      where: { tokenHash: hashToken(token) },
    });
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new HttpError(400, 'This verification link is invalid or has expired');
    }
    await prisma.$transaction([
      prisma.user.update({ where: { id: record.userId }, data: { emailVerifiedAt: new Date() } }),
      prisma.emailVerificationToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    ]);
    securityEvent('auth.email_verified', { userId: record.userId });
    res.json({ ok: true });
  })
);

// POST /auth/resend-verification — request a fresh verification email.
//
// Must work WITHOUT a session: an unverified user cannot log in, so requiring
// auth here would be a catch-22 with no way out. Mirrors forgot-password
// exactly — ALWAYS the same response whether or not the account exists (and
// whether or not it is already verified), so it can't be used to enumerate
// accounts. Rate-limited.
authRouter.post(
  '/resend-verification',
  rateLimit({ windowMs: 15 * 60 * 1000, max: 20, name: 'resend-verification' }),
  asyncHandler(async (req, res) => {
    const { email } = resendVerificationBody.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email } });
    // Already-verified accounts are skipped silently — resending would be noise,
    // and reacting differently would disclose their state.
    if (user && !user.emailVerifiedAt) await sendVerificationEmail(user);
    res.json({
      ok: true,
      message: 'If that email needs confirming, we have sent a new confirmation link.',
    });
  })
);

// POST /auth/verification-token-dev — DEV ONLY (mock hook, like reset-token-dev
// below). Returns the raw verification token last issued for an email so the
// flow is testable without reading the dev mailbox. 404 in production.
authRouter.post(
  '/verification-token-dev',
  asyncHandler(async (req, res) => {
    if (env.isProd) throw new HttpError(404, 'Not found');
    const { email } = resendVerificationBody.parse(req.body);
    const token = peekDevVerificationToken(email);
    if (!token) throw new HttpError(404, 'No verification token issued');
    res.json({ token });
  })
);

// POST /auth/reset-token-dev — DEV ONLY (mock hook, like pay-mock). Returns the
// raw reset token last issued for an email so the flow is testable without
// reading the dev mailbox. 404 in production.
authRouter.post(
  '/reset-token-dev',
  asyncHandler(async (req, res) => {
    if (env.isProd) throw new HttpError(404, 'Not found');
    const { email } = forgotPasswordBody.parse(req.body);
    const token = peekDevResetToken(email);
    if (!token) throw new HttpError(404, 'No reset token issued');
    res.json({ token });
  })
);

// GET /auth/me — the authenticated user.
authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) throw new HttpError(401, 'Authentication required');
    res.json({ user: toPublicUser(user) });
  })
);
