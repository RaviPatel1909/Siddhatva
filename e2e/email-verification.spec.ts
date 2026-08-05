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

test('flag off: an unverified account can still log in (the safe default)', async () => {
  const rc = await pwRequest.newContext();
  const email = newEmail('flagoff');
  await registerAt(rc, SHARED_API, email);

  // THIS is the safe default that matters: with enforcement off, not confirming
  // your email costs you nothing at sign-in. Flipping the flag is what changes
  // it — and nothing else about the signup experience does.
  const res = await loginAt(rc, SHARED_API, email);
  expect(res.status()).toBe(200);
  expect((await res.json()).accessToken).toBeTruthy();
});

test('register establishes NO session, in either flag state', async () => {
  // The core regression guard for this change. Registration used to sign the
  // user straight in whenever enforcement was off, which taught them the
  // confirmation email was ignorable — and would have locked them all out the
  // day the flag was switched on.
  for (const [label, api] of [
    ['flag off', SHARED_API],
    ['flag on', OWN_API],
  ] as const) {
    const rc = await pwRequest.newContext();
    const res = await registerAt(rc, api, newEmail(`nosession${label.replace(/\W/g, '')}`));

    expect(res.status(), label).toBe(201);
    const body = await res.json();
    expect(body.user, `${label}: the created user is still returned`).toBeTruthy();
    expect(body.accessToken, `${label}: no access token may be issued`).toBeUndefined();

    // No refresh cookie either — otherwise the client could silently obtain a
    // session via /auth/refresh and the whole change would be cosmetic.
    const cookies = await rc.storageState();
    expect(
      cookies.cookies.filter((c) => c.name === 'refreshToken'),
      `${label}: no refresh cookie may be set`
    ).toEqual([]);
    expect((await rc.post(`${api}/auth/refresh`)).status(), `${label}: refresh must fail`).toBe(401);
    await rc.dispose();
  }
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
  expect((await reg.json()).accessToken, 'no session may be issued before verification').toBeUndefined();

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
// UI — post-registration. Runs against the SHARED stack (flag off) on purpose:
// the signup experience must be identical in both states, and flag-off is what
// production currently runs, so this is the real user journey today.
// ---------------------------------------------------------------------------

for (const width of [375, 1280]) {
  test.describe(`check-your-email screen @${width}`, () => {
    test.use({ viewport: { width, height: 900 } });

    test('signup lands on it, echoes the address, and warns about spam', async ({ page }) => {
      const email = newEmail(`ui${width}`);
      await page.goto('/register');
      await page.locator('input[name="name"]').fill('Verify Tester');
      await page.locator('input[name="email"]').fill(email);
      await page.locator('input[name="password"]').fill(PASSWORD);
      await page.locator('input[name="confirmPassword"]').fill(PASSWORD);
      await page.getByRole('button', { name: 'Create Account' }).click();

      const panel = page.getByTestId('register-check-inbox');
      await expect(panel).toBeVisible({ timeout: 10_000 });
      await expect(panel).toContainText(email);
      await expect(panel, 'spam guidance is load-bearing while the domain warms up').toContainText(
        /spam or junk/i
      );

      // Not signed in: the account menu only appears for an authenticated user.
      await expect(page.getByRole('button', { name: 'Account menu' })).toHaveCount(0);
      // And it survives a reload — no session was established anywhere.
      await page.goto('/account');
      await expect(page).toHaveURL(/\/login/);
    });

    test('the resend button sends, confirms, and then blocks immediate re-clicks', async ({ page }) => {
      const email = newEmail(`resendui${width}`);
      await page.goto('/register');
      await page.locator('input[name="name"]').fill('Verify Tester');
      await page.locator('input[name="email"]').fill(email);
      await page.locator('input[name="password"]').fill(PASSWORD);
      await page.locator('input[name="confirmPassword"]').fill(PASSWORD);
      await page.getByRole('button', { name: 'Create Account' }).click();
      await expect(page.getByTestId('register-check-inbox')).toBeVisible({ timeout: 10_000 });

      // Count only the resend calls, so the one sent by registration itself
      // isn't mistaken for the button working.
      let resendCalls = 0;
      page.on('request', (r) => {
        if (r.url().includes('/auth/resend-verification') && r.method() === 'POST') resendCalls += 1;
      });

      const button = page.getByTestId('register-resend');
      await expect(button).toBeEnabled();
      await button.click();

      await expect(page.getByTestId('register-check-inbox')).toContainText(/sent/i);
      expect(resendCalls, 'the resend endpoint should have been called once').toBe(1);

      // Cooldown: disabled, and showing the countdown rather than the CTA, so a
      // user who can't find the mail can't burn the rate limit in a few seconds.
      await expect(button).toBeDisabled();
      await expect(button).toHaveText(/Resend in \d+s/);
      expect(resendCalls, 'a disabled button must not fire another request').toBe(1);
    });
  });
}

// ---------------------------------------------------------------------------
// UI — the blocked-login screen a real customer hits once enforcement is on.
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
