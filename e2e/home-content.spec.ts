import { test, expect, Page } from '@playwright/test';
import { ADMIN } from './testCredentials';

// Editable home content: an admin edit persists to the storefront, and the home
// page renders its static fallback if the content API fails (never blank).
//
// Prerequisite: seeded database (see e2e/README.md).

async function loginAdmin(page: Page): Promise<void> {
  await page.goto('/login');
  await page.locator('input[name="email"]').fill(ADMIN.email);
  await page.locator('input[name="password"]').fill(ADMIN.password);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Account menu' })).toBeVisible({ timeout: 10_000 });
}

test('an admin edit to home content persists to the storefront', async ({ page }) => {
  await loginAdmin(page);
  await page.goto('/admin/home');
  const headline = page.getByLabel('Hero headline');
  await expect(headline).toBeVisible({ timeout: 10_000 });
  const original = await headline.inputValue();
  const edited = `E2E Home ${Date.now()}`;

  await headline.fill(edited);
  await page.getByRole('button', { name: 'Save Changes' }).first().click();
  await expect(page.getByText('Saved')).toBeVisible({ timeout: 10_000 });

  // Fresh storefront load reflects the change.
  await page.goto('/');
  await expect(page.locator('h1').first()).toHaveText(edited, { timeout: 10_000 });

  // Restore the original so the suite stays idempotent.
  await page.goto('/admin/home');
  await page.getByLabel('Hero headline').fill(original);
  await page.getByRole('button', { name: 'Save Changes' }).first().click();
  await expect(page.getByText('Saved')).toBeVisible({ timeout: 10_000 });
});

test('home renders the static fallback when the content API fails', async ({ page }) => {
  await page.route('**/site/home', (route) => route.abort());
  await page.goto('/');

  const hero = page.locator('h1').first();
  await expect(hero).toBeVisible({ timeout: 10_000 });
  // The static fallback headline — independent of whatever is in the DB.
  await expect(hero).toHaveText('The Warmth of Silence');
  // The rest of the page still renders via the fallback.
  await expect(page.getByText('Curated Collections')).toBeVisible();
  await expect(page.getByText('The Golden Circle')).toBeVisible();
});

// The flash regression. The static fallback is the ERROR state; it used to double
// as the LOADING state (`data ?? HOME_FALLBACK`), so every visitor rendered the
// stale hardcoded copy on mount and watched it swap to the admin-edited content
// when the query resolved — glaringly obvious on Render free-tier cold starts.
//
// Prove-red: against the old code the fallback headline IS visible during the
// delayed window, so the toHaveCount(0) below fails.
for (const width of [375, 1280]) {
  test(`no flash of stale static content while home content loads @ ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    // Hold the response open to widen the window the flash lived in — this is
    // what a cold start does naturally.
    await page.route('**/site/home', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await route.continue();
    });

    await page.goto('/');

    // Mid-flight, the assertion that matters: the stale hardcoded copy must NOT
    // be on screen. (This is the one that fails on the old code — it rendered
    // HOME_FALLBACK immediately on mount.)
    await expect(page.getByText('The Warmth of Silence')).toHaveCount(0);
    await expect(page.getByText('Explore Summer 24')).toHaveCount(0);
    // ...and what the visitor sees instead is a skeleton hero.
    await expect(page.getByTestId('home-hero-skeleton')).toBeVisible({ timeout: 5_000 });

    // Resolved: real content in, skeleton gone.
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('home-hero-skeleton')).toHaveCount(0);
  });
}
