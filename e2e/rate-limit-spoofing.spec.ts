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
//
// ---------------------------------------------------------------------------
// These tests send a chain shaped like the REAL one, because a hop count can
// only be exercised against the depth it was measured for. Sending a bare client
// address would leave Express clamping at the leftmost entry and every assertion
// here would pass no matter what the count was — which is precisely the sort of
// green-but-meaningless result that let a broken fix reach production before.
// ---------------------------------------------------------------------------

// A random port and per-run client IPs, so a probe server orphaned by an earlier
// run (killing a shell on Windows does not reliably kill `tsx`) can never be
// mistaken for this run's server or leak its rate-limit buckets into it.
const PORT = 4200 + Math.floor(Math.random() * 300);
const RUN = Math.floor(Math.random() * 250) + 1;
const API = `http://localhost:${PORT}/api`;
const REGISTER_MAX = 20; // must match the limiter on POST /auth/register

// The measured production topology (see TRUST_PROXY_HOPS in server/src/env.ts):
//
//   X-Forwarded-For: <client>, <Cloudflare edge>, <Render internal>
//   socket:          <Render router>            (loopback in this spec)
//
// so three addresses sit in front of the client. Both appended entries ROTATE
// per request in production — five consecutive requests from one client logged
// three different Cloudflare edges — and they rotate here too, because that
// rotation is exactly what made the reverted "rightmost public entry" fix stop
// limiting anybody. Keeping it means these tests would catch that regression.
const TRUST_PROXY_HOPS = 3;
const EDGES = ['172.69.94.230', '162.158.227.142', '104.23.197.11', '172.69.86.136'];
const INTERNALS = ['10.28.61.119', '10.30.65.19'];

// A client address as the server actually receives it: what the infrastructure
// appended, in the order it appended it.
const proxied = (client: string, n: number) =>
  `${client}, ${EDGES[n % EDGES.length]}, ${INTERNALS[n % INTERNALS.length]}`;

let server: ChildProcess;

test.beforeAll(async () => {
  server = spawn('npx', ['tsx', 'src/index.ts'], {
    cwd: 'server',
    env: {
      ...process.env,
      TRUST_PROXY: 'true',
      TRUST_PROXY_HOPS: String(TRUST_PROXY_HOPS),
      PORT: String(PORT),
    },
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

  // The client is constant; the addresses the infrastructure appends rotate. The
  // limiter must key on the former and ignore the latter — resolving to a
  // rotating hop is what "nothing is limited for anyone" looked like.
  const client = `203.0.113.${RUN}`;
  const statuses: number[] = [];
  for (let i = 0; i < REGISTER_MAX + 4; i += 1) {
    statuses.push((await hit(rc, proxied(client, i))).status());
  }

  expect(statuses.slice(0, REGISTER_MAX)).toEqual(Array(REGISTER_MAX).fill(400));
  expect(statuses.slice(REGISTER_MAX)).toEqual(Array(4).fill(429));
  expect(statuses).not.toContain(201);
});

test('distinct clients keep separate buckets', async () => {
  const rc = await pwRequest.newContext();

  // Guards the failure mode that a wrong `trust proxy` hop count produces:
  // collapsing every visitor into one bucket and rate-limiting the whole site.
  const first = await hit(rc, proxied(`203.0.114.${RUN}`, 0));
  const second = await hit(rc, proxied(`203.0.115.${RUN}`, 1));

  expect(first.status()).toBe(400);
  expect(second.status()).toBe(400);
});

// This was parked as `test.fixme` while the bypass was open. It is live again now
// that the hop count has been measured from the deployment's own logs rather than
// inferred — the two earlier attempts both picked an entry by position and were
// both wrong in production (leftmost = attacker-controlled; rightmost-public =
// the rotating Cloudflare edge, which limited nobody at all).
test('a spoofed X-Forwarded-For cannot mint fresh rate-limit buckets', async () => {
  const rc = await pwRequest.newContext();

  const realClient = `203.0.116.${RUN}`;
  const statuses: number[] = [];
  for (let i = 0; i < REGISTER_MAX + 4; i += 1) {
    // Vary only the client-supplied leading entry, as an attacker would. Anything
    // forged is PREPENDED, so it sits to the left of the address the trusted
    // infrastructure vouched for and must not affect the bucket.
    statuses.push((await hit(rc, `198.51.100.${i}, ${proxied(realClient, i)}`)).status());
  }

  expect(statuses.slice(0, REGISTER_MAX)).toEqual(Array(REGISTER_MAX).fill(400));
  expect(statuses.slice(REGISTER_MAX)).toEqual(Array(4).fill(429));
  expect(statuses).not.toContain(201);
});

// The mirror image of the test above: forging is only half the risk. A hop count
// set too HIGH reaches past the entries the infrastructure appended and into ones
// the client supplied, at which point two genuinely different visitors sharing a
// forged prefix would collide. Distinct clients must stay distinct even when both
// prepend the same junk.
test('a shared forged prefix does not collapse distinct clients into one bucket', async () => {
  const rc = await pwRequest.newContext();

  // Exhaust one client's bucket while it prepends `forged`, then let a DIFFERENT
  // client prepend the very same value. If the count reached into the forged
  // entry both would share a bucket and the second client would already be
  // locked out — one visitor silencing another.
  const forged = '198.51.100.200';
  const victim = `203.0.117.${RUN}`;
  const bystander = `203.0.118.${RUN}`;

  const exhausted: number[] = [];
  for (let i = 0; i < REGISTER_MAX + 2; i += 1) {
    exhausted.push((await hit(rc, `${forged}, ${proxied(victim, i)}`)).status());
  }
  expect(exhausted.slice(REGISTER_MAX)).toEqual([429, 429]);

  const other = await hit(rc, `${forged}, ${proxied(bystander, 0)}`);
  expect(other.status()).toBe(400);
});
