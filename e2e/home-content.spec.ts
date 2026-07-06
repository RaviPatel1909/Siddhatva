import { test, expect, Page } from '@playwright/test';

// Editable home content: an admin edit persists to the storefront, and the home
// page renders its static fallback if the content API fails (never blank).
//
// Prerequisite: seeded database (see e2e/README.md).

const ADMIN = { email: 'admin@siddhatva.com', password: 'admin1234' };

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
