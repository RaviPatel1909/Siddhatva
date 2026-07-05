import { existsSync } from 'node:fs';
import EmbeddedPostgres from 'embedded-postgres';

// Local dev Postgres with zero system install: embedded-postgres downloads a
// real PostgreSQL binary and runs it. Prisma (CLI + server) connect over TCP
// exactly as they would to any Postgres, so nothing here leaks into app code —
// in production just point DATABASE_URL at a real server and drop this script.
const DATA_DIR = './.pgdata';
const PORT = 5432;
const DB_NAME = 'siddhatva';

const pg = new EmbeddedPostgres({
  databaseDir: DATA_DIR,
  user: 'postgres',
  password: 'postgres',
  port: PORT,
  persistent: true,
});

async function main() {
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

  const shutdown = async () => {
    console.log('\n› stopping Postgres…');
    try {
      await pg.stop();
    } catch {
      /* ignore */
    }
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Keep the process (and Postgres) alive.
  await new Promise<never>(() => {});
}

main().catch(async (err) => {
  console.error(err);
  try {
    await pg.stop();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
