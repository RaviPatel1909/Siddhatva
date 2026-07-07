import { Response, Router } from 'express';
import { prisma } from '../prisma';
import { asyncHandler, HttpError } from '../lib/http';
import { requireAuth } from '../middleware/auth';
import { rateLimit } from '../middleware/rateLimit';
import { forgotPasswordBody, loginBody, registerBody, resetPasswordBody } from '../schemas';
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
import { emailService } from '../lib/email/service';
import { renderPasswordReset } from '../emails/render';
import { env } from '../env';

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
  asyncHandler(async (req, res) => {
    const { email, name, password } = registerBody.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new HttpError(409, 'An account with that email already exists');

    const user = await prisma.user.create({
      data: { email, name, password: await hashPassword(password), role: 'CUSTOMER' },
    });
    const accessToken = await issueSession(res, { id: user.id, role: 'CUSTOMER' });
    res.status(201).json({ user: toPublicUser(user), accessToken });
  })
);

// POST /auth/login
authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = loginBody.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await verifyPassword(password, user.password))) {
      throw new HttpError(401, 'Invalid email or password');
    }
    const accessToken = await issueSession(res, { id: user.id, role: user.role as Role });
    res.json({ user: toPublicUser(user), accessToken });
  })
);

// POST /auth/refresh — rotate the refresh token and mint a new access token.
authRouter.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const raw = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    if (!raw) throw new HttpError(401, 'Missing refresh token');

    const tokenHash = hashToken(raw);
    const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });
    if (!stored) {
      clearRefreshCookie(res);
      throw new HttpError(401, 'Invalid refresh token');
    }
    // Reuse of an already-rotated token → likely theft; revoke the whole family.
    if (stored.revokedAt) {
      await prisma.refreshToken.updateMany({
        where: { userId: stored.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      clearRefreshCookie(res);
      throw new HttpError(401, 'Refresh token already used');
    }
    if (stored.expiresAt < new Date()) {
      clearRefreshCookie(res);
      throw new HttpError(401, 'Refresh token expired');
    }

    const user = await prisma.user.findUnique({ where: { id: stored.userId } });
    if (!user) {
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
  rateLimit({ windowMs: 15 * 60 * 1000, max: 5, name: 'forgot-password' }),
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
  rateLimit({ windowMs: 15 * 60 * 1000, max: 10, name: 'reset-password' }),
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
    clearRefreshCookie(res);
    res.json({ ok: true });
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
