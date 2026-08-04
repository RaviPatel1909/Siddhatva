import { test, expect, request as pwRequest, APIRequestContext } from '@playwright/test';
import { spawn, ChildProcess } from 'child_process';

// Rate limiting must key on the REAL client, not a value the client can choose.
//
// The bug this guards (verified live on production before the fix): clientIp()
// read the LEFTMOST X-Forwarded-For entry whenever TRUST_PROXY was set. A proxy
// APPENDS the address it saw to whatever the client sent, so the leftmost entry
// is attacker-controlled — a caller could mint a fresh bucket per request just
// by varying the header, defeating every limiter (login, register, checkout,
// password reset, and the global /api backstop). That is the gap behind the
// flood of scripted `user_<hex>@example.com` signups.
//
// The e2e stack runs WITHOUT TRUST_PROXY (no proxy in local dev), so this spec
// boots its own server with TRUST_PROXY=true on a spare port — that flag is what
// activates the vulnerable path, so testing against the shared server would
// prove nothing.
//
// No accounts are created: the limiter runs BEFORE the handler, so an empty body
// still counts toward the bucket and then fails Zod with 400.

// A random port and a per-run client IP prefix, so a probe server orphaned by an
// earlier run (killing a shell on Windows does not reliably kill `tsx`) can never
// be mistaken for this run's server or leak its rate-limit buckets into it.
const PORT = 4200 + Math.floor(Math.random() * 300);
const RUN = Math.floor(Math.random() * 250) + 1; // last octet, unique per run
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
    // process (which then keeps holding its port and its rate-limit buckets), so
    // take down the whole tree.
    spawn('taskkill', ['/pid', String(server.pid), '/T', '/F'], { stdio: 'ignore' });
  } else {
    server.kill();
  }
});

const hit = (rc: APIRequestContext, forwardedFor: string) =>
  rc.post(`${API}/auth/register`, {
    headers: { 'X-Forwarded-For': forwardedFor },
    data: {}, // invalid on purpose — 400 after the limiter, never creates a user
  });

test('a spoofed X-Forwarded-For cannot mint fresh rate-limit buckets', async () => {
  const rc = await pwRequest.newContext();

  // The proxy-appended (rightmost) address is what must be keyed on. Vary ONLY
  // the client-supplied leading entry — as an attacker would — and keep the
  // appended real address fixed, exactly as a real proxy would.
  const realClient = `203.0.113.${RUN}`;
  const statuses: number[] = [];
  for (let i = 0; i < REGISTER_MAX + 5; i += 1) {
    const res = await hit(rc, `198.51.100.${i}, ${realClient}`);
    statuses.push(res.status());
  }

  // Every request claimed a different leading IP, but they share one real
  // client, so the limit must still bite. Pre-fix this array was all 400s.
  expect(statuses.slice(0, REGISTER_MAX)).toEqual(Array(REGISTER_MAX).fill(400));
  expect(statuses.slice(REGISTER_MAX)).toEqual(Array(5).fill(429));
  // And nothing was created along the way.
  expect(statuses).not.toContain(201);
});

test('a genuinely different client still gets its own bucket', async () => {
  const rc = await pwRequest.newContext();

  // Distinct real (proxy-appended) clients must NOT share a bucket — otherwise
  // the fix would rate-limit the whole site as one visitor.
  const first = await hit(rc, `198.51.100.1, 203.0.114.${RUN}`);
  const second = await hit(rc, `198.51.100.1, 203.0.115.${RUN}`);

  expect(first.status()).toBe(400);
  expect(second.status()).toBe(400);
});

test('internal hops after the client address are skipped', async () => {
  const rc = await pwRequest.newContext();

  // A platform that appends its own private-range hops must not collapse every
  // visitor into one bucket — the rightmost PUBLIC entry is the client.
  const withHops = (client: string) => `198.51.100.5, ${client}, 10.0.0.4, 172.16.0.9`;

  const a = await hit(rc, withHops(`203.0.116.${RUN}`));
  const b = await hit(rc, withHops(`203.0.117.${RUN}`));
  expect(a.status()).toBe(400);
  expect(b.status()).toBe(400);

  // ...while the same client behind those hops still shares one bucket.
  const same = `203.0.118.${RUN}`;
  const statuses: number[] = [];
  for (let i = 0; i < REGISTER_MAX + 2; i += 1) {
    statuses.push((await hit(rc, withHops(same))).status());
  }
  expect(statuses.slice(-2)).toEqual([429, 429]);
});
