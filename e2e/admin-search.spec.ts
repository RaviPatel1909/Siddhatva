import { test, expect, Page } from '@playwright/test';
import { ADMIN } from './testCredentials';

// The admin topbar search: a grouped typeahead across products, orders, and
// customers (GET /admin/search). The box is hidden below the lg breakpoint —
// the admin panel is desktop-only — so this suite runs at 1280.
//
// Prerequisite: seeded database (see e2e/README.md). Assertions target real seed
// data (src/data + server/prisma/seed.ts): product "Linen Trench Coat", order
// "ORD-8243", and the sole seeded customer "Alexander Sterling"
// (customer@siddhatva.com), who owns every seeded order.

test.use({ viewport: { width: 1280, height: 900 } });

async function loginAdmin(page: Page): Promise<void> {
  await page.goto('/login');
  await page.locator('input[name="email"]').fill(ADMIN.email);
  await page.locator('input[name="password"]').fill(ADMIN.password);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Account menu' })).toBeVisible({ timeout: 10_000 });
}

// Scope the search input by placeholder — /admin pages also render native
// <select> comboboxes, so a bare combobox role is ambiguous.
async function search(page: Page, query: string): Promise<void> {
  const box = page.getByPlaceholder('Search management...');
  await box.click();
  await box.fill(query);
}

// One group's result rows, scoped to the search listbox (past the native selects).
const groupRows = (page: Page, label: string) =>
  page.locator(`#admin-search-listbox [role="group"][aria-label="${label}"] [role="option"]`);

test('product result appears under Products and navigates to product management', async ({ page }) => {
  await loginAdmin(page);
  await page.goto('/admin');

  await search(page, 'Linen Trench');
  const row = groupRows(page, 'Products').filter({ hasText: 'Linen Trench Coat' });
  await expect(row).toBeVisible({ timeout: 10_000 });

  await row.click();
  await expect(page).toHaveURL(/\/admin\/products/);
  // The product is present on the management page it landed on.
  await expect(page.getByText('Linen Trench Coat').first()).toBeVisible({ timeout: 10_000 });
});

test('order result appears under Orders and navigates to order management', async ({ page }) => {
  await loginAdmin(page);
  await page.goto('/admin');

  await search(page, 'ORD-8243');
  const row = groupRows(page, 'Orders').filter({ hasText: 'ORD-8243' });
  await expect(row).toBeVisible({ timeout: 10_000 });

  await row.click();
  await expect(page).toHaveURL(/\/admin\/orders/);
  // Confirm the order is present on the page it landed on. The order table
  // paginates (and other specs add orders), so filter to it rather than assume
  // it's on page 1.
  await page.getByPlaceholder('Search order ID or customer...').fill('ORD-8243');
  await expect(page.getByText('#ORD-8243')).toBeVisible({ timeout: 10_000 });
});

test('customer result navigates to that customer’s detail page', async ({ page }) => {
  await loginAdmin(page);
  await page.goto('/admin');

  // Match on email — proves the customer group searches the User table.
  await search(page, 'customer@siddhatva.com');
  const row = groupRows(page, 'Customers').filter({ hasText: 'Alexander Sterling' });
  await expect(row).toBeVisible({ timeout: 10_000 });

  await row.click();
  // Now that the customer page exists, a customer result lands on their detail
  // page (identity route), which lists their orders — not a name-filtered order list.
  await expect(page).toHaveURL(/\/admin\/customers\/[^/]+$/);
  await expect(page.getByRole('heading', { name: 'Alexander Sterling' })).toBeVisible({
    timeout: 10_000,
  });
  await expect(page.getByText('#SID-98231')).toBeVisible();
});
