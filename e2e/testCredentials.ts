// Centralized seed-account credentials for the e2e suite — sourced from the
// SAME env vars prisma/seed.ts reads (SEED_ADMIN_PASSWORD / SEED_CUSTOMER_PASSWORD;
// see server/.env.example). playwright.config.ts loads server/.env, and CI sets
// them directly in .github/workflows/ci.yml, so both `npm run seed` and this
// test run see identical values.
//
// No password is hardcoded here: seeding without these set generates a random
// password instead (printed once to the console), so a hardcoded fallback here
// would silently drift out of sync with whatever the DB was actually seeded
// with. Missing env → fail loudly with the fix, not a confusing login failure.
function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set. The e2e suite needs a deterministic seed password — set ` +
        `${name} in server/.env (see server/.env.example) before running ` +
        '`npm run seed` and `npm run test:e2e`.'
    );
  }
  return value;
}

export const ADMIN = { email: 'admin@siddhatva.com', password: required('SEED_ADMIN_PASSWORD') };
export const CUSTOMER = { email: 'customer@siddhatva.com', password: required('SEED_CUSTOMER_PASSWORD') };
