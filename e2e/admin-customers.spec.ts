import { test, expect, Page } from '@playwright/test';
import { ADMIN } from './testCredentials';

// The admin Customers page: a paginated list + per-customer detail (their orders).
// Desktop-only (admin panel), so this runs at 1280.
//
// Prerequisite: seeded database (see e2e/README.md). The seed has one customer —
// "Alexander Sterling" (customer@siddhatva.com) — who owns every seeded order,
// including SID-98231. Assertions key on that known customer + order so they stay
// deterministic against orders other specs accumulate.

test.use({ viewport: { width: 1280, height: 900 } });

async function loginAdmin(page: Page): Promise<void> {
  await page.goto('/login');
  await page.locator('input[name="email"]').fill(ADMIN.email);
  await page.locator('input[name="password"]').fill(ADMIN.password);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Account menu' })).toBeVisible({ timeout: 10_000 });
}

test('customers list renders the seeded customer', async ({ page }) => {
  await loginAdmin(page);
  await page.goto('/admin/customers');

  const row = page.getByRole('link', { name: /Alexander Sterling/ });
  await expect(row).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText('customer@siddhatva.com')).toBeVisible();
});

test('clicking a customer opens their detail with their orders', async ({ page }) => {
  await loginAdmin(page);
  await page.goto('/admin/customers');

  await page.getByRole('link', { name: /Alexander Sterling/ }).click();
  await expect(page).toHaveURL(/\/admin\/customers\/[^/]+$/);

  // Detail shows the customer identity and their orders (by userId, not name).
  await expect(page.getByRole('heading', { name: 'Alexander Sterling' })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText('customer@siddhatva.com')).toBeVisible();
  await expect(page.getByText('#SID-98231')).toBeVisible();
});

test('customer detail links to their identity-filtered orders', async ({ page }) => {
  await loginAdmin(page);
  await page.goto('/admin/customers');
  await page.getByRole('link', { name: /Alexander Sterling/ }).click();
  await expect(page.getByRole('heading', { name: 'Alexander Sterling' })).toBeVisible({ timeout: 10_000 });

  await page.getByRole('link', { name: /View in Order Management/ }).click();
  // Order list filtered by userId (identity), not a name substring. The banner name
  // is resolved from a matched order, so this proves the filter applied and found
  // the customer's orders. (Don't assert a specific order id — this list paginates
  // and other specs add orders.)
  await expect(page).toHaveURL(/\/admin\/orders\?customerId=/);
  await expect(page.getByText(/Showing orders for Alexander Sterling/)).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('table tbody tr').first()).toBeVisible();
});

test('the customers list search filters by name/email', async ({ page }) => {
  await loginAdmin(page);
  await page.goto('/admin/customers');
  const search = page.getByPlaceholder('Search by name or email...');

  await search.fill('alexander');
  await expect(page.getByRole('link', { name: /Alexander Sterling/ })).toBeVisible({ timeout: 10_000 });

  await search.fill('zzznomatch');
  await expect(page.getByText('No customers found')).toBeVisible({ timeout: 10_000 });
});
