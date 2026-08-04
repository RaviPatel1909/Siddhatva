import { test, expect, Page, APIRequestContext } from '@playwright/test';

// Catalog filtering: colour, size and price range, driven from the slide-out
// Filter panel and carried in the URL so a filtered grid is shareable.
//
// PROVE-RED HISTORY — both bugs this guards were live in production:
//
//   size  — the API supported `size` end to end (contract, Zod, Express, MSW) but
//           the Shop sidebar rendered the six sizes as decorative <span>s off a
//           hardcoded list, with no click handler and no state. Nothing ever sent
//           the param. Every "select a size" assertion below fails on that code:
//           there is no size control to click.
//   price — the param did not exist anywhere: no minPrice/maxPrice in the client
//           params, the Zod schema, Express, MSW or the contract, and the slider
//           was literally `disabled`. The API-level price assertions below fail on
//           that code because the bounds are ignored and the full catalog returns.
//
// Seeded catalog facts used here (server/prisma/seed.ts):
//   XXL is offered by exactly one product — L'Artiste Silk Blazer (Women, ₹6,490).
//   Men holds 5 products spanning ₹3,290–₹6,990; only Silk Satin Evening Shirt is black.
//   Catalog price range is ₹2,490–₹7,990.
const XXL_ONLY_PRODUCT = "L'Artiste Silk Blazer";
const MEN_CHEAPEST = 'Silk Satin Evening Shirt'; // ₹3,290, black
const MEN_DEAREST = 'Bespoke Chelsea Boots'; // ₹6,990
// ₹2,990 and on page 1 of /shop (the catalog is 14 items at pageSize 8), so a
// ₹6,000 floor visibly drops it without pagination confusing the assertion.
const CHEAP_PAGE_ONE = 'Pure Cashmere Scarf';

async function openFilters(page: Page): Promise<void> {
  await page.getByTestId('filter-trigger').click();
  await expect(page.getByTestId('filter-panel')).toBeVisible();
}

async function products(request: APIRequestContext, query: string) {
  const res = await request.get(`http://localhost:4000/api/products?pageSize=50&${query}`);
  expect(res.status(), `GET /products?${query}`).toBe(200);
  return res.json();
}

// ---------------------------------------------------------------------------
// API level — the price feature itself (the half that did not exist at all)
// ---------------------------------------------------------------------------

test.describe('price range filtering (API)', () => {
  test('minPrice / maxPrice narrow the catalog with inclusive bounds', async ({ request }) => {
    const all = await products(request, '');
    expect(all.total).toBeGreaterThan(4);

    // Inclusive on both ends: a product priced exactly at a bound is included.
    const banded = await products(request, 'minPrice=3290&maxPrice=3490');
    expect(banded.total).toBeGreaterThan(0);
    expect(banded.total).toBeLessThan(all.total);
    const prices: number[] = banded.items.map((p: { price: number }) => p.price);
    expect(Math.min(...prices)).toBeGreaterThanOrEqual(3290);
    expect(Math.max(...prices)).toBeLessThanOrEqual(3490);
    // The boundary values themselves are in, not off by one.
    expect(prices).toContain(3290);
    expect(prices).toContain(3490);
  });

  test('an absent maxPrice means no upper bound', async ({ request }) => {
    const open = await products(request, 'minPrice=6000');
    expect(open.total).toBeGreaterThan(0);
    for (const p of open.items) expect(p.price).toBeGreaterThanOrEqual(6000);
    // The dearest piece in the catalog is still reachable with no ceiling set.
    const all = await products(request, '');
    const dearest = Math.max(...all.items.map((p: { price: number }) => p.price));
    expect(open.items.some((p: { price: number }) => p.price === dearest)).toBe(true);
  });

  test('price bounds are validated, not coerced', async ({ request }) => {
    for (const bad of ['minPrice=abc', 'minPrice=10.5', 'minPrice=-5', 'maxPrice=nope']) {
      const res = await request.get(`http://localhost:4000/api/products?${bad}`);
      expect(res.status(), bad).toBe(400);
    }
    // An inverted range is a legitimate request that simply matches nothing.
    const inverted = await products(request, 'minPrice=7000&maxPrice=3000');
    expect(inverted.total).toBe(0);
  });

  test('every filter ANDs — category + size + colour + price together', async ({ request }) => {
    const composed = await products(
      request,
      'category=Men&size=M&color=black&minPrice=3000&maxPrice=3400'
    );
    expect(composed.total).toBe(1);
    expect(composed.items[0].name).toBe(MEN_CHEAPEST);

    // Tightening any one axis past the match empties it — proof each is applied.
    const tooDear = await products(request, 'category=Men&size=M&color=black&minPrice=4000');
    expect(tooDear.total).toBe(0);
    const wrongSize = await products(request, 'category=Men&size=XXL&color=black');
    expect(wrongSize.total).toBe(0);
  });

  test('size ANDs with a text query', async ({ request }) => {
    const blazers = await products(request, 'q=Blazer');
    expect(blazers.total).toBeGreaterThan(1);
    const xxlBlazers = await products(request, 'q=Blazer&size=XXL');
    expect(xxlBlazers.total).toBe(1);
    expect(xxlBlazers.items[0].name).toBe(XXL_ONLY_PRODUCT);
  });
});

// ---------------------------------------------------------------------------
// Facets — only the options that actually exist in the current context
// ---------------------------------------------------------------------------

test.describe('facets reflect the filter context', () => {
  test('refinement facets narrow to the category; navigation facets do not', async ({ request }) => {
    const all = await products(request, '');
    const men = await products(request, 'category=Men');

    // Colours and sizes shrink to what Men actually offers — this is what stops
    // the panel offering options that return zero products.
    expect(men.facets.colors.length).toBeLessThan(all.facets.colors.length);
    expect(men.facets.sizes.length).toBeLessThan(all.facets.sizes.length);
    expect(men.facets.price.min).toBeGreaterThanOrEqual(all.facets.price.min);
    expect(men.facets.price.max).toBeLessThanOrEqual(all.facets.price.max);

    // Categories are navigation: always the whole catalog, so none can vanish.
    expect(men.facets.categories).toEqual(all.facets.categories);

    // Every colour offered is genuinely reachable, with an honest count.
    for (const c of men.facets.colors) {
      expect(c.count).toBeGreaterThan(0);
      const hits = await products(request, `category=Men&color=${encodeURIComponent(c.id)}`);
      expect(hits.total, `colour ${c.id} should return products`).toBe(c.count);
    }
    for (const s of men.facets.sizes) {
      expect(s.count).toBeGreaterThan(0);
      const hits = await products(request, `category=Men&size=${encodeURIComponent(s.value)}`);
      expect(hits.total, `size ${s.value} should return products`).toBe(s.count);
    }
  });

  test('selecting a colour does not remove the other colours (no dead end)', async ({ request }) => {
    const men = await products(request, 'category=Men');
    const black = await products(request, 'category=Men&color=black');
    // The colour facet excludes its own filter, so the shopper can still switch.
    expect(black.facets.colors).toEqual(men.facets.colors);
    expect(black.facets.colors.length).toBeGreaterThan(1);
  });

  test('sizes come from the catalog, not a hardcoded list', async ({ request }) => {
    const all = await products(request, '');
    const values: string[] = all.facets.sizes.map((s: { value: string }) => s.value);
    // The old UI hardcoded exactly XS,S,M,L,XL,XXL. The real catalog also carries
    // numeric shoe sizes and "One Size" — a fixed list can only ever drift.
    expect(values).toContain('One Size');
    expect(values.some((v) => /^\d+$/.test(v))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// UI level — the panel, at both widths
// ---------------------------------------------------------------------------

for (const width of [375, 1280]) {
  test.describe(`filter panel @ ${width}`, () => {
    test.use({ viewport: { width, height: 900 } });

    test('selecting a size actually filters the grid', async ({ page }) => {
      await page.goto('/shop');
      await expect(page.getByRole('heading', { name: XXL_ONLY_PRODUCT })).toBeVisible({
        timeout: 10_000,
      });

      await openFilters(page);
      // XXL is offered by exactly one seeded product.
      await page.getByTestId('filter-size-XXL').click();
      await page.getByTestId('filter-apply').click();

      await expect(page).toHaveURL(/size=XXL/);
      await expect(page.getByRole('heading', { name: XXL_ONLY_PRODUCT })).toBeVisible();
      // Everything else is gone — the grid really narrowed.
      await expect(page.getByRole('heading', { name: 'Linen Trench Coat' })).toHaveCount(0);
      await expect(page.getByTestId('filter-count')).toHaveText('1');
    });

    test('a colour selection survives a reload and shows on the closed control', async ({ page }) => {
      await page.goto('/shop/Men');
      await openFilters(page);
      await page.getByTestId('filter-color-black').click();
      await page.getByTestId('filter-apply').click();

      await expect(page).toHaveURL(/color=black/);
      await expect(page.getByRole('heading', { name: MEN_CHEAPEST })).toBeVisible();
      await expect(page.getByRole('heading', { name: MEN_DEAREST })).toHaveCount(0);

      // URL state, not component state: a shared link reproduces the same grid.
      await page.reload();
      await expect(page.getByRole('heading', { name: MEN_CHEAPEST })).toBeVisible({
        timeout: 10_000,
      });
      await expect(page.getByTestId('filter-count')).toHaveText('1');
    });
  });
}

test.describe('filter panel behaviour @ 1280', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('the price slider filters, and the label is formatted INR', async ({ page }) => {
    await page.goto('/shop');
    await expect(page.getByRole('heading', { name: CHEAP_PAGE_ONE })).toBeVisible({
      timeout: 10_000,
    });

    await openFilters(page);
    // Drag the minimum up to ₹6,000 — the ₹2,490 cuff must drop out.
    await page.getByTestId('filter-price-min').fill('6000');
    await page.getByTestId('filter-apply').click();

    await expect(page).toHaveURL(/minPrice=6000/);
    await expect(page.getByTestId('filter-count')).toHaveText('1');
    await expect(page.getByRole('heading', { name: CHEAP_PAGE_ONE })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: XXL_ONLY_PRODUCT })).toBeVisible();

    // Displayed bounds go through formatPrice (₹ + Indian grouping), never raw.
    await openFilters(page);
    await expect(page.getByTestId('filter-price-label')).toContainText('₹6,000');
  });

  test('filters compose in the URL and clear all resets them', async ({ page }) => {
    await page.goto('/shop/Men');
    await openFilters(page);
    await page.getByTestId('filter-color-black').click();
    await page.getByTestId('filter-size-M').click();
    await page.getByTestId('filter-apply').click();

    await expect(page).toHaveURL(/color=black/);
    await expect(page).toHaveURL(/size=M/);
    await expect(page.getByTestId('filter-count')).toHaveText('2');
    await expect(page.getByRole('heading', { name: MEN_CHEAPEST })).toBeVisible();

    await page.getByTestId('clear-filters-inline').click();
    await expect(page).not.toHaveURL(/color=/);
    await expect(page).not.toHaveURL(/size=/);
    await expect(page.getByTestId('filter-count')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: MEN_DEAREST })).toBeVisible();
  });

  test('changing a filter resets pagination to page 1', async ({ page }) => {
    // Page 2 of the unfiltered catalog, then filter: a stale page=2 would show an
    // empty grid for a filter that has only a handful of matches.
    await page.goto('/shop?page=2');
    await expect(page.getByTestId('filter-trigger')).toBeVisible({ timeout: 10_000 });

    await openFilters(page);
    await page.getByTestId('filter-size-XXL').click();
    await page.getByTestId('filter-apply').click();

    await expect(page).not.toHaveURL(/page=2/);
    await expect(page.getByRole('heading', { name: XXL_ONLY_PRODUCT })).toBeVisible();
    await expect(page.getByTestId('no-matches')).toHaveCount(0);
  });

  test('back and forward move through filter states', async ({ page }) => {
    await page.goto('/shop/Men');
    await expect(page.getByRole('heading', { name: MEN_DEAREST })).toBeVisible({ timeout: 10_000 });

    await openFilters(page);
    await page.getByTestId('filter-color-black').click();
    await page.getByTestId('filter-apply').click();
    await expect(page.getByRole('heading', { name: MEN_DEAREST })).toHaveCount(0);

    await page.goBack();
    await expect(page.getByRole('heading', { name: MEN_DEAREST })).toBeVisible();
    await page.goForward();
    await expect(page.getByRole('heading', { name: MEN_DEAREST })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: MEN_CHEAPEST })).toBeVisible();
  });

  test('the panel offers only colours that exist in the current category', async ({ page }) => {
    // The whole catalog has champagne; Men does not. Landing on /shop/Men must not
    // offer it — picking it would return an empty grid.
    await page.goto('/shop');
    await openFilters(page);
    await expect(page.getByTestId('filter-color-champagne')).toBeVisible();
    await page.keyboard.press('Escape');

    await page.goto('/shop/Men');
    await openFilters(page);
    await expect(page.getByTestId('filter-color-black')).toBeVisible();
    await expect(page.getByTestId('filter-color-champagne')).toHaveCount(0);
  });

  test('the filter panel works on search results too', async ({ page }) => {
    await page.goto('/search?q=Blazer');
    await expect(page.getByRole('heading', { name: XXL_ONLY_PRODUCT })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByRole('heading', { name: 'Sculpted Wool Blazer' })).toBeVisible();

    await openFilters(page);
    await page.getByTestId('filter-size-XXL').click();
    await page.getByTestId('filter-apply').click();

    // Size ANDs with the text query, on the search surface.
    await expect(page).toHaveURL(/q=Blazer/);
    await expect(page).toHaveURL(/size=XXL/);
    await expect(page.getByRole('heading', { name: XXL_ONLY_PRODUCT })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Sculpted Wool Blazer' })).toHaveCount(0);
  });
});
