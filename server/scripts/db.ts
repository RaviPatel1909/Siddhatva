import { existsSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import net from 'node:net';
import EmbeddedPostgres from 'embedded-postgres';

// Local dev Postgres with zero system install: embedded-postgres downloads a
// real PostgreSQL binary and runs it. Prisma (CLI + server) connect over TCP
// exactly as they would to any Postgres, so nothing here leaks into app code —
// in production just point DATABASE_URL at a real server and drop this script.
//
// Stale-lock recovery (dev gotcha): if a prior run didn't exit cleanly, Postgres
// leaves a `postmaster.pid` behind. On the next start Postgres may refuse with
// "lock file postmaster.pid already exists" — intermittently, because it depends
// on whether the OS has reused the recorded PID. On startup we check the lock
// ourselves: dead/garbage PID → remove it and start; a live Postgres already
// listening on our port → reuse it; anything ambiguous → a clear message + the
// `npm run db:reset-lock` escape hatch. All of this is DEV-ONLY.
const DATA_DIR = './.pgdata';
const PORT = 5432;
const DB_NAME = 'siddhatva';
const PID_FILE = join(DATA_DIR, 'postmaster.pid');

const pg = new EmbeddedPostgres({
  databaseDir: DATA_DIR,
  user: 'postgres',
  password: 'postgres',
  port: PORT,
  persistent: true,
});

// Hard gate: the embedded Postgres is a dev-only convenience. Production must
// point DATABASE_URL at a real managed database and never runs this script.
function refuseInProduction(): void {
  if (process.env.NODE_ENV === 'production') {
    console.error(
      'Refusing to run the embedded dev Postgres with NODE_ENV=production. ' +
        'Set DATABASE_URL to a real Postgres server instead.'
    );
    process.exit(1);
  }
}

// PostgreSQL's postmaster.pid: line 1 = PID, line 4 = port (see PG docs).
function readLock(): { pid: number; port: number } | null {
  if (!existsSync(PID_FILE)) return null;
  try {
    const lines = readFileSync(PID_FILE, 'utf8').split('\n');
    const pid = Number(lines[0]?.trim());
    const port = Number(lines[3]?.trim());
    if (!Number.isInteger(pid) || pid <= 0) return null; // empty/garbage lock
    return { pid, port: Number.isInteger(port) && port > 0 ? port : PORT };
  } catch {
    return null;
  }
}

// signal 0 tests for existence without touching the process. ESRCH → gone;
// EPERM → alive but not ours to signal (still "alive" for our purposes).
function isPidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return (err as NodeJS.ErrnoException).code === 'EPERM';
  }
}

function isPortOpen(port: number, timeoutMs = 600): Promise<boolean> {
  return new Promise((resolve) => {
    const sock = new net.Socket();
    const finish = (open: boolean) => {
      sock.destroy();
      resolve(open);
    };
    sock.setTimeout(timeoutMs);
    sock.once('connect', () => finish(true));
    sock.once('timeout', () => finish(false));
    sock.once('error', () => finish(false));
    sock.connect(port, '127.0.0.1');
  });
}

function removeLock(reason: string): void {
  try {
    rmSync(PID_FILE, { force: true });
    console.log(`› ${reason} — removed stale lock (${PID_FILE}).`);
  } catch (err) {
    console.warn(`› could not remove ${PID_FILE}: ${(err as Error).message}`);
  }
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Resolve the lock situation before starting. Returns whether to start our own
// Postgres, reuse an already-running one, or (on ambiguity) exits with guidance.
async function resolveLock(): Promise<'start' | 'reuse'> {
  if (!existsSync(PID_FILE)) return 'start';

  const lock = readLock();
  if (!lock) {
    removeLock('empty/unreadable lock file');
    return 'start';
  }

  const { pid, port } = lock;
  if (!isPidAlive(pid)) {
    removeLock(`lock PID ${pid} is not running`);
    return 'start';
  }

  // PID is alive — is it actually a Postgres serving our port? (Give a
  // just-starting server a couple of quick chances before deciding.)
  let listening = false;
  for (let i = 0; i < 3 && !listening; i++) {
    listening = await isPortOpen(port);
    if (!listening) await delay(300);
  }
  if (listening) {
    console.log(`✔ Postgres already running (PID ${pid}) on :${port} — reusing it.`);
    console.log(`  postgresql://postgres:postgres@localhost:${PORT}/${DB_NAME}`);
    return 'reuse';
  }

  // Alive but nothing on the port: likely a reused PID, or a broken start.
  console.error(
    `\nCannot safely start: the lock names PID ${pid} (alive) but nothing is ` +
      `listening on :${port}.\n` +
      `This usually means the PID was reused by an unrelated process after an ` +
      `unclean exit.\n` +
      `Fix it with:  npm run db:reset-lock\n`
  );
  process.exit(1);
}

// `npm run db:reset-lock` — documented escape hatch. Stops any process still
// holding the lock and removes the lock file so `npm run db` can start clean.
async function resetLock(): Promise<void> {
  refuseInProduction();
  const lock = readLock();
  if (!existsSync(PID_FILE)) {
    console.log('› no lock file present — nothing to reset.');
    return;
  }
  if (lock && isPidAlive(lock.pid)) {
    console.log(`› lock PID ${lock.pid} is alive — terminating it…`);
    try {
      process.kill(lock.pid);
      await delay(1000);
    } catch (err) {
      console.warn(`› could not terminate PID ${lock.pid}: ${(err as Error).message}`);
    }
  }
  removeLock('reset-lock');
  console.log('✔ lock reset. Run `npm run db` to start Postgres.');
}

async function main(): Promise<void> {
  refuseInProduction();

  if (await resolveLock() === 'reuse') {
    // The DB is already up (owned by another process); our job is done.
    return;
  }

  if (!existsSync(DATA_DIR)) {
    console.log('› initialising data directory…');
    await pg.initialise();
  }
  await pg.start();
  try {
    await pg.createDatabase(DB_NAME);
    console.log(`› created database "${DB_NAME}"`);
  } catch {
    // already exists — fine
  }
  console.log(`✔ Postgres ready: postgresql://postgres:postgres@localhost:${PORT}/${DB_NAME}`);

  // Graceful shutdown: stop Postgres cleanly (which removes postmaster.pid), then
  // sweep the lock as a belt-and-suspenders so the next start is never blocked.
  let stopping = false;
  const shutdown = async (signal: string) => {
    if (stopping) return;
    stopping = true;
    console.log(`\n› received ${signal} — stopping Postgres…`);
    try {
      await pg.stop();
    } catch {
      /* ignore */
    }
    if (existsSync(PID_FILE)) removeLock('post-stop cleanup');
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));

  // Keep the process (and Postgres) alive.
  await new Promise<never>(() => {});
}

const entry = process.argv.includes('--reset-lock') ? resetLock() : main();
entry.catch(async (err) => {
  console.error(err);
  try {
    await pg.stop();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
