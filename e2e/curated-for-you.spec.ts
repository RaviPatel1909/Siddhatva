import { test, expect, Page } from '@playwright/test';
import { CUSTOMER } from './testCredentials';

// "Curated for You" (the cart page's recommendation strip) must be sourced from the
// LIVE catalog, never a bundled static fixture. A fixture resurfaces products that
// have been deleted from the catalog — they 404 on click. This is the same class of
// bug the Home "New Arrivals" strip once had (see the vault's Known-Gaps history).
//
// Prerequisite: seeded database. Runs at 1280.

test.use({ viewport: { width: 1280, height: 900 } });

async function loginCustomer(page: Page): Promise<void> {
  await page.goto('/login');
  await page.locator('input[name="email"]').fill(CUSTOMER.email);
  await page.locator('input[name="password"]').fill(CUSTOMER.password);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Account menu' })).toBeVisible({ timeout: 10_000 });
}

async function addItemAndOpenCart(page: Page): Promise<void> {
  await page.goto('/product/1');
  await page.getByRole('button', { name: 'Add to Cart' }).click();
  await page.goto('/cart');
  await expect(page.getByRole('heading', { name: /your shopping bag/i })).toBeVisible({ timeout: 10_000 });
}

test('Curated for You renders live-catalog products that resolve (no phantom 404)', async ({ page }) => {
  await loginCustomer(page);
  await addItemAndOpenCart(page);

  const heading = page.getByRole('heading', { name: 'Curated for You' });
  await expect(heading).toBeVisible({ timeout: 10_000 });

  // Click the first curated card; it must land on a real product page (which has an
  // "Add to Cart" button), not the 404/error state a deleted product would produce.
  await heading.locator('xpath=following-sibling::div[1]/div[1]').click();
  await expect(page).toHaveURL(/\/product\//);
  await expect(page.getByRole('button', { name: 'Add to Cart' })).toBeVisible({ timeout: 10_000 });
});

test('Curated for You reflects the live catalog — empty catalog hides the strip', async ({ page }) => {
  await loginCustomer(page);

  // Force the live catalog listing to look empty. A live-sourced strip reflects this
  // (nothing to curate → no section). A static-fixture strip would ignore it and
  // still render products — so this fails against the pre-fix code.
  await page.route(
    (url) => url.pathname.endsWith('/api/products'),
    async (route) => {
      const resp = await route.fetch();
      const body = await resp.json();
      await route.fulfill({ json: { ...body, items: [], total: 0 } });
    }
  );

  await addItemAndOpenCart(page);
  await expect(page.getByRole('heading', { name: 'Curated for You' })).toHaveCount(0);
});
