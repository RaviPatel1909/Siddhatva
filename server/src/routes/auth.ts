import { Response, Router } from 'express';
import { prisma } from '../prisma';
import { asyncHandler, HttpError } from '../lib/http';
import { requireAuth } from '../middleware/auth';
import { loginBody, registerBody } from '../schemas';
import { hashPassword, verifyPassword } from '../lib/password';
import {
  generateRefreshToken,
  hashToken,
  refreshExpiry,
  Role,
  signAccessToken,
} from '../lib/tokens';
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
