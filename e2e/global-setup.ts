import { CUSTOMER } from './testCredentials';

// Verifies the prerequisite: the API is reachable and the database is seeded
// (the standard `customer@siddhatva.com` account exists). Polls so it works
// whether the API is already up or the webServer is still starting it.
async function globalSetup(): Promise<void> {
  const deadline = Date.now() + 60_000;
  const seedHint =
    'Start and seed the stack first:\n' +
    '  (cd server && npm run db)      # embedded Postgres\n' +
    '  (cd server && npm run seed)    # admin + customer with data\n' +
    '  (cd server && npm run dev)     # API on :4000';

  while (Date.now() < deadline) {
    try {
      const res = await fetch('http://localhost:4000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: CUSTOMER.email, password: CUSTOMER.password }),
      });
      if (res.ok) return; // API up + seeded
      if (res.status === 401) {
        throw new Error(`E2E prerequisite: seeded customer login was rejected.\n${seedHint}`);
      }
    } catch (err) {
      if (err instanceof Error && err.message.startsWith('E2E prerequisite')) throw err;
      // network error → API not up yet; keep polling
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`E2E prerequisite: API/database not reachable at :4000.\n${seedHint}`);
}

export default globalSetup;
