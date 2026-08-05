import { test, expect, request, APIRequestContext } from '@playwright/test';

// Password reset flow. Uses freshly-registered accounts so it never disturbs the
// shared seed accounts the other specs log in with.
//
// Prerequisite: seeded database, dev email mode (no RESEND_API_KEY) — the raw
// token is retrieved via the dev-only peek hook (mirrors pay-mock).

const API = 'http://localhost:4000/api';

const register = (rc: APIRequestContext, email: string, password: string) =>
  rc.post(`${API}/auth/register`, { data: { email, name: 'Reset Tester', password } });

const forgot = (rc: APIRequestContext, email: string) =>
  rc.post(`${API}/auth/forgot-password`, { data: { email } });

const peekToken = async (rc: APIRequestContext, email: string): Promise<string> => {
  const res = await rc.post(`${API}/auth/reset-token-dev`, { data: { email } });
  return (await res.json()).token as string;
};

const reset = (rc: APIRequestContext, token: string, newPassword: string) =>
  rc.post(`${API}/auth/reset-password`, { data: { token, newPassword } });

const login = (rc: APIRequestContext, email: string, password: string) =>
  rc.post(`${API}/auth/login`, { data: { email, password } });

// Unique email per run so re-runs don't collide on the unique constraint.
const uniqueEmail = (tag: string) => `reset-${tag}-${Date.now()}@test.local`;

test('forgot-password gives an identical response for existing vs non-existing email', async () => {
  const rc = await request.newContext();
  const email = uniqueEmail('enum');
  await register(rc, email, 'oldpassword123');

  const existing = await forgot(rc, email);
  const missing = await forgot(rc, uniqueEmail('nobody'));

  expect(existing.status()).toBe(missing.status());
  expect(existing.status()).toBe(200);
  expect(await existing.json()).toEqual(await missing.json());
  await rc.dispose();
});

test('reset sets the new password, is single-use, and revokes existing sessions', async () => {
  const session = await request.newContext();
  const email = uniqueEmail('single');
  // Register does NOT establish a session, so this context has to log in to hold
  // a refresh cookie. Without that the revocation assertion below would pass
  // vacuously — /auth/refresh 401s just as readily when no cookie was ever set,
  // which would look green while proving nothing.
  await register(session, email, 'oldpassword123');
  expect((await login(session, email, 'oldpassword123')).status()).toBe(200);

  // Reset is driven from a SEPARATE context so `session` keeps its old refresh
  // cookie — letting us prove it's revoked (not merely cleared).
  const rc = await request.newContext();
  await forgot(rc, email);
  const token = await peekToken(rc, email);

  const first = await reset(rc, token, 'newpassword456');
  expect(first.status()).toBe(200);

  // Single-use: the same token can't be used again.
  const second = await reset(rc, token, 'anotherpass789');
  expect(second.status()).toBe(400);

  // The new password works; the old one no longer does.
  expect((await login(rc, email, 'newpassword456')).status()).toBe(200);
  expect((await login(rc, email, 'oldpassword123')).status()).toBe(401);

  // The pre-reset session's refresh token was revoked → refresh fails.
  const refreshed = await session.post(`${API}/auth/refresh`);
  expect(refreshed.status()).toBe(401);

  await rc.dispose();
  await session.dispose();
});

test('an invalid reset token is rejected', async () => {
  const rc = await request.newContext();
  const res = await reset(rc, 'not-a-real-token', 'whatever12345');
  expect(res.status()).toBe(400);
  await rc.dispose();
});
