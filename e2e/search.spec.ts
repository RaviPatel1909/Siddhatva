import { test, expect, Page } from '@playwright/test';

// Customer-facing product search: the navbar search field routes to
// /search?q=<query>, and the results page reuses the Shop machinery (grid, sort,
// pagination) while ANDing the text query with an optional category filter.
//
// Prove-red history: before this feature the navbar search button was inert (submit
// did nothing → the URL never became /search) and /search did not exist. Both the
// "lands on results" and "empty state" assertions fail against that prior code.
//
// Runs at 375 (mobile) and 1280 (desktop). No auth required — search is public.
// Prerequisite: seeded database (the "Blazer" products come from the seed catalog).

// Two seeded products contain "Blazer": "L'Artiste Silk Blazer" (Women) and
// "Sculpted Wool Blazer" (Men) — so a "Blazer" search spans two categories, which
// lets us prove the category filter composes (search AND category).
const WOMEN_BLAZER = "L'Artiste Silk Blazer";
const MEN_BLAZER = 'Sculpted Wool Blazer';

async function searchFor(page: Page, term: string): Promise<void> {
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  const box = page.getByRole('searchbox', { name: 'Search products' });
  await expect(box).toBeVisible();
  await box.fill(term);
  await box.press('Enter');
}

for (const width of [375, 1280]) {
  test.describe(`product search @ ${width}`, () => {
    test.use({ viewport: { width, height: 900 } });

    test('navbar search lands on /search and shows matching products', async ({ page }) => {
      await page.goto('/');
      await searchFor(page, 'Blazer');

      await expect(page).toHaveURL(/\/search\?q=Blazer/);
      await expect(page.getByRole('heading', { name: /Results for/i })).toBeVisible({ timeout: 10_000 });
      // Both blazers (across two categories) are present — search isn't category-scoped.
      await expect(page.getByRole('heading', { name: WOMEN_BLAZER })).toBeVisible();
      await expect(page.getByRole('heading', { name: MEN_BLAZER })).toBeVisible();
    });

    test('a query matching nothing shows the empty state, not an error or phantom result', async ({ page }) => {
      await page.goto('/');
      await searchFor(page, 'zzzznope');

      await expect(page).toHaveURL(/\/search\?q=zzzznope/);
      await expect(page.getByRole('heading', { name: /No products match/i })).toBeVisible({ timeout: 10_000 });
      // Honest empty state: a route back to Shop, no error alert, no product cards.
      await expect(page.getByRole('button', { name: /Browse the collection/i })).toBeVisible();
      await expect(page.getByRole('alert')).toHaveCount(0);
    });
  });
}

test.describe('search composes with a category filter', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('filtering the "Blazer" results by category ANDs with the query', async ({ page }) => {
    await page.goto('/');
    await searchFor(page, 'Blazer');

    await expect(page.getByRole('heading', { name: WOMEN_BLAZER })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('heading', { name: MEN_BLAZER })).toBeVisible();

    // Narrow to Men — the Women blazer must drop out, the Men blazer must remain.
    await page.getByRole('button', { name: 'Men', exact: true }).click();

    await expect(page.getByRole('heading', { name: MEN_BLAZER })).toBeVisible();
    await expect(page.getByRole('heading', { name: WOMEN_BLAZER })).toHaveCount(0);
  });
});
