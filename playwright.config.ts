import { defineConfig, devices } from '@playwright/test';

// Standing end-to-end suite. Requires a seeded database — the embedded Postgres
// must be running and `npm run seed` applied (see e2e/README.md). The frontend
// and API are started automatically here (or reused if already running).
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1, // tests share the seeded accounts; run them serially
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  globalSetup: './e2e/global-setup.ts',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    actionTimeout: 15_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'npm run dev',
      url: 'http://localhost:3000',
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: 'npm --prefix server run dev',
      url: 'http://localhost:4000/health',
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
});
