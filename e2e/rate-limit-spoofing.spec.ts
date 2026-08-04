import { test, expect, request as pwRequest, APIRequestContext } from '@playwright/test';
import { spawn, ChildProcess } from 'child_process';

// Rate limiting behind a trusted proxy.
//
// The e2e stack runs WITHOUT TRUST_PROXY (no proxy in local dev), and that flag is
// what selects the X-Forwarded-For code path — so this spec boots its own server
// with TRUST_PROXY=true on a spare port. Testing the shared server would prove
// nothing about the deployed behaviour.
//
// No accounts are created: the limiter runs BEFORE the handler, so an empty body
// still counts toward the bucket and then fails Zod with 400.

// A random port and per-run client IPs, so a probe server orphaned by an earlier
// run (killing a shell on Windows does not reliably kill `tsx`) can never be
// mistaken for this run's server or leak its rate-limit buckets into it.
const PORT = 4200 + Math.floor(Math.random() * 300);
const RUN = Math.floor(Math.random() * 250) + 1;
const API = `http://localhost:${PORT}/api`;
const REGISTER_MAX = 20; // must match the limiter on POST /auth/register

let server: ChildProcess;

test.beforeAll(async () => {
  server = spawn('npx', ['tsx', 'src/index.ts'], {
    cwd: 'server',
    env: { ...process.env, TRUST_PROXY: 'true', PORT: String(PORT) },
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
  throw new Error(`probe server did not start on :${PORT}`);
});

test.afterAll(async () => {
  if (!server?.pid) return;
  if (process.platform === 'win32') {
    // `tsx` runs under a cmd shell here; killing the shell orphans the node
    // process (which then keeps holding its port and its rate-limit buckets).
    spawn('taskkill', ['/pid', String(server.pid), '/T', '/F'], { stdio: 'ignore' });
  } else {
    server.kill();
  }
});

const hit = (rc: APIRequestContext, forwardedFor?: string) =>
  rc.post(`${API}/auth/register`, {
    headers: forwardedFor ? { 'X-Forwarded-For': forwardedFor } : {},
    data: {}, // invalid on purpose — 400 after the limiter, never creates a user
  });

test('a client that does not forge the header is limited', async () => {
  const rc = await pwRequest.newContext();

  const client = `203.0.113.${RUN}`;
  const statuses: number[] = [];
  for (let i = 0; i < REGISTER_MAX + 4; i += 1) {
    statuses.push((await hit(rc, client)).status());
  }

  expect(statuses.slice(0, REGISTER_MAX)).toEqual(Array(REGISTER_MAX).fill(400));
  expect(statuses.slice(REGISTER_MAX)).toEqual(Array(4).fill(429));
  expect(statuses).not.toContain(201);
});

test('distinct clients keep separate buckets', async () => {
  const rc = await pwRequest.newContext();

  // Guards the failure mode that a wrong `trust proxy` hop count produces:
  // collapsing every visitor into one bucket and rate-limiting the whole site.
  const first = await hit(rc, `203.0.114.${RUN}`);
  const second = await hit(rc, `203.0.115.${RUN}`);

  expect(first.status()).toBe(400);
  expect(second.status()).toBe(400);
});

// KNOWN OPEN ISSUE — deliberately marked fixme rather than deleted, so the gap
// stays visible in the suite instead of being quietly forgotten.
//
// The limiter keys on the LEFTMOST X-Forwarded-For entry, which the client
// controls: a proxy appends to whatever the caller sent, so varying the header
// mints a fresh bucket per request. Verified against production — with the real
// IP's bucket exhausted and returning 429, a unique spoofed X-Forwarded-For
// returned a fresh 400 every time. This defeats every limiter (login, register,
// checkout, password reset, global backstop) and is the likely gap behind the
// flood of scripted signups.
//
// The obvious fix — keying on the rightmost public entry — was tried and
// REVERTED: on the real Render deployment it resolved to something appended after
// the client address that is not stable per client, so nothing was limited at
// all, which is worse than a bypass requiring deliberate spoofing. Fixing this
// correctly needs the platform's real forwarded chain, which
// `security.rate_limited` now logs as `forwarded`. Read one such line from the
// deployment's logs, count the hops, set Express `trust proxy` to that count, key
// on `req.ip`, then un-fixme this test.
test.fixme('a spoofed X-Forwarded-For cannot mint fresh rate-limit buckets', async () => {
  const rc = await pwRequest.newContext();

  const realClient = `203.0.116.${RUN}`;
  const statuses: number[] = [];
  for (let i = 0; i < REGISTER_MAX + 4; i += 1) {
    // Vary only the client-supplied leading entry, as an attacker would, while
    // the proxy-appended address stays fixed.
    statuses.push((await hit(rc, `198.51.100.${i}, ${realClient}`)).status());
  }

  expect(statuses.slice(REGISTER_MAX)).toEqual(Array(4).fill(429));
});
