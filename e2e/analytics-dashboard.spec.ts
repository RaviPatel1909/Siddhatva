import { test, expect, Page } from '@playwright/test';
import { ADMIN } from './testCredentials';

// Analytics Dashboard UI (/admin/analytics). Admin page consuming the
// /admin/analytics/* API. Data-dependent assertions use route interception for
// determinism; the "loads" smoke hits the real backend. The admin panel is
// desktop-first, but the analytics content must stay overflow-safe at 375 too.
//
// Prerequisite: seeded database.

async function loginAdmin(page: Page): Promise<void> {
  await page.goto('/login');
  await page.locator('input[name="email"]').fill(ADMIN.email);
  await page.locator('input[name="password"]').fill(ADMIN.password);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Account menu' })).toBeVisible({ timeout: 10_000 });
}

const ZERO = {
  overview: { revenue: 0, orders: 0, paidOrders: 0, customers: 0, averageOrderValue: 0, lowStock: 0, outOfStock: 0, reviews: 0 },
  revenue: [{ date: '2026-07-01', revenue: 0, orders: 0 }],
  orders: {
    fulfillment: { processing: 0, shipped: 0, delivered: 0, cancelled: 0 },
    payment: { pendingPayment: 0, paid: 0, failedPayment: 0 },
    shipping: { notShipped: 0, shipmentCreated: 0, inTransit: 0, outForDelivery: 0, delivered: 0, cancelled: 0 },
  },
  products: [],
  customers: { newCustomers: 0, returningCustomers: 0, registrationsOverTime: [{ date: '2026-07-01', count: 0 }] },
};

const POP = {
  overview: { revenue: 125000, orders: 42, paidOrders: 38, customers: 12, averageOrderValue: 3289, lowStock: 3, outOfStock: 1, reviews: 7 },
  revenue: [
    { date: '2026-07-01', revenue: 40000, orders: 12 },
    { date: '2026-07-02', revenue: 55000, orders: 16 },
    { date: '2026-07-03', revenue: 30000, orders: 10 },
  ],
  orders: {
    fulfillment: { processing: 5, shipped: 8, delivered: 24, cancelled: 1 },
    payment: { pendingPayment: 4, paid: 38, failedPayment: 0 },
    shipping: { notShipped: 6, shipmentCreated: 2, inTransit: 5, outForDelivery: 3, delivered: 24, cancelled: 1 },
  },
  products: [
    { productId: '1', productName: 'Silk Blazer', unitsSold: 20, revenue: 80000, orderCount: 15 },
    { productId: '2', productName: 'Linen Trench', unitsSold: 9, revenue: 45000, orderCount: 8 },
  ],
  customers: {
    newCustomers: 8,
    returningCustomers: 4,
    registrationsOverTime: [
      { date: '2026-07-01', count: 3 },
      { date: '2026-07-02', count: 5 },
      { date: '2026-07-03', count: 0 },
    ],
  },
};

type Fixtures = typeof ZERO;

async function routeAnalytics(page: Page, f: Fixtures): Promise<void> {
  const map: [string, unknown][] = [
    ['overview', f.overview],
    ['revenue', f.revenue],
    ['orders', f.orders],
    ['products', f.products],
    ['customers', f.customers],
  ];
  for (const [name, json] of map) {
    await page.route(`**/admin/analytics/${name}**`, (route) => route.fulfill({ json }));
  }
}

const SECTION_TITLES = ['Revenue Trend', 'Orders Overview', 'Customer Insights', 'Top Products', 'Inventory Summary', 'Quick Insights'];

test.describe('analytics dashboard @1280', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('loads with every widget and no console errors (real backend)', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    page.on('pageerror', (e) => errors.push(e.message));

    await loginAdmin(page);
    await page.goto('/admin/analytics');

    await expect(page.getByRole('heading', { name: 'Analytics', level: 2 })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('group', { name: 'Analytics date range' })).toBeVisible();
    await expect(page.getByText('Revenue', { exact: true }).first()).toBeVisible();
    for (const title of SECTION_TITLES) {
      await expect(page.getByRole('heading', { name: title })).toBeVisible();
    }
    // The in-memory access token is lost on a full page load, so the first authed
    // requests 401 then transparently refresh+retry (see src/api/client.ts). Those
    // 401s are browser network noise by design — assert no *other* console errors.
    const appErrors = errors.filter((e) => !/status of 401/.test(e));
    expect(appErrors).toEqual([]);
  });

  test('filter switching updates the URL and the back button restores it', async ({ page }) => {
    await loginAdmin(page);
    await routeAnalytics(page, POP);
    await page.goto('/admin/analytics');

    // Default preset is Last 30 Days.
    await expect(page.getByRole('button', { name: 'Last 30 Days' })).toHaveAttribute('aria-pressed', 'true');

    await page.getByRole('button', { name: 'Last 7 Days' }).click();
    await expect(page).toHaveURL(/range=7d/);
    await expect(page.getByRole('button', { name: 'Last 7 Days' })).toHaveAttribute('aria-pressed', 'true');

    await page.getByRole('button', { name: 'Today', exact: true }).click();
    await expect(page).toHaveURL(/range=today/);

    await page.goBack();
    await expect(page).toHaveURL(/range=7d/);
    await expect(page.getByRole('button', { name: 'Last 7 Days' })).toHaveAttribute('aria-pressed', 'true');
  });

  test('renders populated data with values, chart summary and top products', async ({ page }) => {
    await loginAdmin(page);
    await routeAnalytics(page, POP);
    await page.goto('/admin/analytics');

    await expect(page.getByRole('heading', { name: '₹1,25,000' })).toBeVisible(); // revenue KPI
    await expect(page.getByText(/Total ₹1,25,000 across 38 paid orders/)).toBeVisible(); // chart textual summary
    await expect(page.getByRole('cell', { name: 'Silk Blazer' })).toBeVisible(); // top products table
    await expect(page.getByText('Top selling product')).toBeVisible(); // quick insight
  });

  test('honest empty/zero state', async ({ page }) => {
    await loginAdmin(page);
    await routeAnalytics(page, ZERO);
    await page.goto('/admin/analytics');

    await expect(page.getByText('No sales yet')).toBeVisible(); // top products empty
    await expect(page.getByText('No orders in this period')).toBeVisible(); // orders empty
    await expect(page.getByText('₹0').first()).toBeVisible(); // revenue KPI zero, not blank
  });

  test('one failed widget errors independently with a retry; the rest render', async ({ page }) => {
    await loginAdmin(page);
    await routeAnalytics(page, POP);
    // Override orders to fail after the base routes are set.
    await page.route('**/admin/analytics/orders**', (route) =>
      route.fulfill({ status: 500, json: { message: 'boom' } })
    );
    await page.goto('/admin/analytics');

    // Orders widget shows its error + retry...
    await expect(page.getByText("Couldn't load this section").first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Try Again' }).first()).toBeVisible();
    // ...while the rest of the dashboard is unaffected.
    await expect(page.getByRole('heading', { name: '₹1,25,000' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Silk Blazer' })).toBeVisible();
  });

  test('shows loading skeletons before data resolves', async ({ page }) => {
    await loginAdmin(page);
    await routeAnalytics(page, POP);
    // Hold the overview response so the KPI skeletons stay up.
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    await page.route('**/admin/analytics/overview**', async (route) => {
      await gate;
      await route.fulfill({ json: POP.overview });
    });

    await page.goto('/admin/analytics');
    await expect(page.locator('.animate-pulse').first()).toBeVisible();
    release();
    await expect(page.getByRole('heading', { name: '₹1,25,000' })).toBeVisible();
  });
});

test.describe('analytics dashboard @375', () => {
  test.use({ viewport: { width: 375, height: 800 } });

  // The admin shell is desktop-first (fixed 256px sidebar — a documented known
  // gap), so at 375 the content column is narrow. What must hold: the page renders,
  // the filter is reachable, and the analytics content adds no horizontal page
  // overflow (grids collapse, tables scroll internally, the chart scales via viewBox).
  test('is overflow-safe on mobile', async ({ page }) => {
    await loginAdmin(page);
    await routeAnalytics(page, POP);
    await page.goto('/admin/analytics');

    await expect(page.getByRole('heading', { name: 'Analytics', level: 2 })).toBeVisible();

    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    );
    expect(overflows).toBeFalsy();
  });
});
