import { test, expect, request as pwRequest, APIRequestContext } from '@playwright/test';
import { spawn, ChildProcess } from 'child_process';
import { ADMIN, CUSTOMER } from './testCredentials';

// Email verification.
//
// Enforcement is gated by REQUIRE_EMAIL_VERIFICATION, which is OFF on the shared
// e2e stack (as it is in production until the deliverability check passes). So
// this spec covers both states:
//
//   - against the SHARED server (flag off) — the safe default: registration
//     still signs you straight in and nothing is gated. This is the assertion
//     that says "deploying this changes nothing until you opt in", and it is the
//     most important test here.
//   - against its OWN server booted with the flag ON — the enforced behaviour.
//     Same idiom as e2e/rate-limit-spoofing.spec.ts, and for the same reason:
//     the flag is read at startup, so the shared stack cannot exercise it.
//
// Tokens are read through the dev-only peek hook (404 in production), which
// mirrors how password-reset is tested — no mailbox required.

const SHARED_API = 'http://localhost:4000/api';

// Own port + per-run identities so a server orphaned by an earlier run can't be
// mistaken for this one, and re-runs never collide on an existing email.
const PORT = 4600 + Math.floor(Math.random() * 300);
const OWN_API = `http://localhost:${PORT}/api`;
const RUN = `${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;
const PASSWORD = 'verify-me-1234';

const newEmail = (tag: string) => `verify_${tag}_${RUN}@example.com`;

let server: ChildProcess;

test.beforeAll(async () => {
  server = spawn('npx', ['tsx', 'src/index.ts'], {
    cwd: 'server',
    env: { ...process.env, REQUIRE_EMAIL_VERIFICATION: 'true', PORT: String(PORT) },
    stdio: 'ignore',
    shell: process.platform === 'win32',
  });

  const rc = await pwRequest.newContext();
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    try {
      const res = await rc.get(`http://localhost:${PORT}/health`);
      if (res.ok()) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`enforcing server did not start on :${PORT}`);
});

test.afterAll(async () => {
  if (!server?.pid) return;
  if (process.platform === 'win32') {
    // `tsx` runs under a cmd shell here; killing the shell orphans the node
    // process, which then keeps holding its port.
    spawn('taskkill', ['/pid', String(server.pid), '/T', '/F'], { stdio: 'ignore' });
  } else {
    server.kill();
  }
});

const registerAt = (rc: APIRequestContext, api: string, email: string) =>
  rc.post(`${api}/auth/register`, { data: { email, name: 'Verify Tester', password: PASSWORD } });

const loginAt = (rc: APIRequestContext, api: string, email: string, password = PASSWORD) =>
  rc.post(`${api}/auth/login`, { data: { email, password } });

// The dev-only peek hook — the raw token the user would receive by email.
async function tokenFor(rc: APIRequestContext, api: string, email: string): Promise<string> {
  const res = await rc.post(`${api}/auth/verification-token-dev`, { data: { email } });
  expect(res.status(), 'dev verification-token hook should return a token').toBe(200);
  return (await res.json()).token as string;
}

// ---------------------------------------------------------------------------
// Flag OFF — the safe default. This is what production runs on deploy.
// ---------------------------------------------------------------------------

test('flag off: registration still signs the user straight in', async () => {
  const rc = await pwRequest.newContext();
  const email = newEmail('flagoff');

  const res = await registerAt(rc, SHARED_API, email);
  expect(res.status()).toBe(201);
  const body = await res.json();

  // Unchanged behaviour: a session comes back immediately.
  expect(body.accessToken, 'an access token must still be issued').toBeTruthy();
  expect(body.verificationRequired).toBe(false);

  // And the unverified account can log in, exactly as before this feature.
  expect((await loginAt(rc, SHARED_API, email)).status()).toBe(200);
});

test('flag off: a verification email is still issued (flow is live, just not gating)', async () => {
  const rc = await pwRequest.newContext();
  const email = newEmail('flagoffmail');
  await registerAt(rc, SHARED_API, email);

  // The token exists even with enforcement off — which is what lets the
  // deliverability check be done in production before flipping the flag.
  const token = await tokenFor(rc, SHARED_API, email);
  expect(token).toMatch(/^[a-f0-9]{64}$/);

  const verified = await rc.post(`${SHARED_API}/auth/verify-email`, { data: { token } });
  expect(verified.status()).toBe(200);
});

// ---------------------------------------------------------------------------
// Flag ON — enforced.
// ---------------------------------------------------------------------------

test('flag on: register → blocked login → verify → login succeeds', async () => {
  const rc = await pwRequest.newContext();
  const email = newEmail('full');

  // Register withholds the session — signup must not grant what login refuses.
  const reg = await registerAt(rc, OWN_API, email);
  expect(reg.status()).toBe(201);
  const regBody = await reg.json();
  expect(regBody.verificationRequired).toBe(true);
  expect(regBody.accessToken, 'no session may be issued before verification').toBeUndefined();

  // Correct credentials, unverified address → 403 with the discriminator the
  // login page branches on (not a 401, which would be indistinguishable from a
  // wrong password).
  const blocked = await loginAt(rc, OWN_API, email);
  expect(blocked.status()).toBe(403);
  expect((await blocked.json()).code).toBe('EMAIL_NOT_VERIFIED');

  // A WRONG password on the same unverified account must still look like a
  // normal credentials failure — otherwise the 403 becomes an oracle for "this
  // address is registered".
  const wrongPw = await loginAt(rc, OWN_API, email, 'not-the-password');
  expect(wrongPw.status()).toBe(401);
  expect((await wrongPw.json()).code).toBeUndefined();

  // Verify, then the same credentials work.
  const token = await tokenFor(rc, OWN_API, email);
  expect((await rc.post(`${OWN_API}/auth/verify-email`, { data: { token } })).status()).toBe(200);

  const ok = await loginAt(rc, OWN_API, email);
  expect(ok.status()).toBe(200);
  expect((await ok.json()).accessToken).toBeTruthy();
});

test('flag on: a verification token is single-use and a stale one is refused', async () => {
  const rc = await pwRequest.newContext();
  const email = newEmail('single');
  await registerAt(rc, OWN_API, email);

  const first = await tokenFor(rc, OWN_API, email);

  // Resending invalidates the outstanding link, so the FIRST token is now dead
  // even though it hasn't been used and hasn't expired.
  await rc.post(`${OWN_API}/auth/resend-verification`, { data: { email } });
  const second = await tokenFor(rc, OWN_API, email);
  expect(second).not.toBe(first);
  expect((await rc.post(`${OWN_API}/auth/verify-email`, { data: { token: first } })).status()).toBe(400);

  // The current one works once...
  expect((await rc.post(`${OWN_API}/auth/verify-email`, { data: { token: second } })).status()).toBe(200);
  // ...and not twice.
  expect((await rc.post(`${OWN_API}/auth/verify-email`, { data: { token: second } })).status()).toBe(400);

  // A garbage token is refused the same way — no distinct error to probe with.
  expect(
    (await rc.post(`${OWN_API}/auth/verify-email`, { data: { token: 'a'.repeat(64) } })).status()
  ).toBe(400);
});

test('flag on: resend works logged out and does not reveal whether an account exists', async () => {
  const rc = await pwRequest.newContext();
  const real = newEmail('resend');
  await registerAt(rc, OWN_API, real);

  // No session is sent on any of these — an unverified user has none, so this
  // endpoint has to work logged out or the flow is a dead end.
  const forReal = await rc.post(`${OWN_API}/auth/resend-verification`, { data: { email: real } });
  const forUnknown = await rc.post(`${OWN_API}/auth/resend-verification`, {
    data: { email: `nobody_${RUN}@example.com` },
  });
  // Already-verified accounts are a third case that must also look identical.
  const forVerified = await rc.post(`${OWN_API}/auth/resend-verification`, {
    data: { email: CUSTOMER.email },
  });

  expect(forReal.status()).toBe(200);
  expect(forUnknown.status()).toBe(forReal.status());
  expect(forVerified.status()).toBe(forReal.status());
  const [a, b, c] = await Promise.all([forReal.json(), forUnknown.json(), forVerified.json()]);
  expect(b).toEqual(a);
  expect(c).toEqual(a);

  // And no token was minted for the address that doesn't exist.
  expect(
    (await rc.post(`${OWN_API}/auth/verification-token-dev`, { data: { email: `nobody_${RUN}@example.com` } })).status()
  ).toBe(404);
});

test('flag on: the admin account is grandfathered and can still sign in', async () => {
  const rc = await pwRequest.newContext();

  // The anti-lockout guarantee. The migration marks every existing ADMIN
  // verified, and the seed does the same for the fixture admin — so enforcement
  // can never cost anyone the admin panel.
  const res = await loginAt(rc, OWN_API, ADMIN.email, ADMIN.password);
  expect(res.status(), 'an admin must never be locked out by enforcement').toBe(200);
  expect((await res.json()).user.role).toBe('ADMIN');
});

// ---------------------------------------------------------------------------
// UI — the screen a real customer actually hits.
// ---------------------------------------------------------------------------

test.describe('blocked-login screen', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('explains what to do, mentions spam, and offers a resend', async ({ page }) => {
    const rc = await pwRequest.newContext();
    const email = newEmail('ui');
    await registerAt(rc, OWN_API, email);

    // Point the app at the enforcing server for this test only.
    await page.route('**/api/auth/**', (route) => {
      const url = new URL(route.request().url());
      return route.continue({ url: `${OWN_API}${url.pathname.replace(/^\/api/, '')}${url.search}` });
    });

    await page.goto('/login');
    // Targeted by input name, matching the other auth specs (the form's labels
    // aren't htmlFor-associated, so getByLabel doesn't resolve them).
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill(PASSWORD);
    await page.locator('form').getByRole('button', { name: /sign in/i }).click();

    const panel = page.getByTestId('login-unverified');
    await expect(panel).toBeVisible();
    await expect(panel).toContainText(email);
    await expect(panel).toContainText(/spam/i);
    // Still on /login — not signed in, not navigated to the account area.
    await expect(page).toHaveURL(/\/login$/);

    await panel.getByRole('button', { name: /resend/i }).click();
    await expect(panel).toContainText(/sent/i);
  });
});
