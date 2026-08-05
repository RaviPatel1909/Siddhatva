import { test, expect, Page } from '@playwright/test';
import { CUSTOMER } from './testCredentials';

// Regression guard for cross-account data isolation — the class of bug fixed in
// ad502fe, where one account's wishlist leaked into the next account to log in
// (via the shared guest store during the logout→login transition).
//
// Prerequisite: a seeded database (see e2e/README.md). The `customer` account
// has wishlist items + orders; fresh accounts are registered per run.

// A product that is NOT in the customer's seeded wishlist (7, 8, 9), so we can
// prove a guest-merged item doesn't bleed into the customer's list.
const NON_CUSTOMER_PRODUCT = '1';

const accountMenu = (page: Page) => page.getByRole('button', { name: 'Account menu' });

async function loginUI(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  // exact:true so this matches the "Sign In" submit, not the navbar's
  // aria-label="Sign in" icon (getByRole matches the accessible name).
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await expect(accountMenu(page)).toBeVisible({ timeout: 10_000 });
}

// Create an account AND sign into it.
//
// Registration deliberately no longer establishes a session — it ends on the
// "check your email" screen — so signing in is now a separate step. The guest →
// account wishlist merge is driven by `user` becoming non-null in AuthContext,
// which the login triggers, so the isolation behaviour under test is unchanged;
// only the number of steps to reach a signed-in fresh account is.
async function registerUI(page: Page, name: string, email: string, password: string): Promise<void> {
  await page.goto('/register');
  await page.locator('input[name="name"]').fill(name);
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('input[name="confirmPassword"]').fill(password);
  await page.getByRole('button', { name: 'Create Account' }).click();
  await expect(page.getByTestId('register-check-inbox')).toBeVisible({ timeout: 10_000 });
  await loginUI(page, email, password);
}

async function logoutUI(page: Page): Promise<void> {
  await accountMenu(page).click();
  await page.getByRole('button', { name: 'Sign Out' }).click();
  // The account menu disappearing is the unambiguous "logged out" signal
  // (logout may land on / or on /login via the protected-route redirect).
  await expect(accountMenu(page)).toHaveCount(0, { timeout: 10_000 });
}

// The product names currently shown on the wishlist page ([] when empty).
async function wishlistNames(page: Page): Promise<string[]> {
  await page.goto('/account/wishlist');
  await page.waitForLoadState('networkidle');
  if (await page.getByText('Your wishlist is empty').count()) return [];
  return page
    .locator('.grid img')
    .evaluateAll((imgs) => imgs.map((i) => i.getAttribute('alt') ?? '').filter(Boolean));
}

// The order ids currently shown on the orders page ([] when empty).
async function orderIds(page: Page): Promise<string[]> {
  await page.goto('/account/orders');
  await page.waitForLoadState('networkidle');
  const text = await page.locator('body').innerText();
  if (/No orders yet/i.test(text)) return [];
  return [...new Set(text.match(/SID-\d+/g) ?? [])];
}

async function addGuestWishlist(page: Page, productId: string): Promise<void> {
  await page.goto(`/product/${productId}`);
  await page.waitForLoadState('networkidle');
  // The wishlist heart is the button immediately after "Add to Cart".
  await page
    .getByRole('button', { name: 'Add to Cart' })
    .locator('xpath=following-sibling::button[1]')
    .click();
}

test('a fresh account sees NONE of the customer’s wishlist or orders', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();

  // The customer has data (sanity — otherwise the isolation check is vacuous).
  await loginUI(page, CUSTOMER.email, CUSTOMER.password);
  const customerWishlist = await wishlistNames(page);
  const customerOrders = await orderIds(page);
  expect(customerWishlist.length, 'customer should have seeded wishlist items').toBeGreaterThan(0);
  expect(customerOrders.length, 'customer should have seeded orders').toBeGreaterThan(0);

  // Log out and, IN THE SAME BROWSER CONTEXT, register a brand-new account. This
  // is the exact logout→login transition that leaked in ad502fe.
  await logoutUI(page);
  const freshEmail = `iso_${Date.now()}@example.com`;
  await registerUI(page, 'Iso Fresh', freshEmail, 'password123');

  const freshWishlist = await wishlistNames(page);
  const freshOrders = await orderIds(page);

  // The fresh account must see ZERO wishlist items and ZERO orders...
  expect(freshWishlist, 'fresh account wishlist must be empty').toEqual([]);
  expect(freshOrders, 'fresh account orders must be empty').toEqual([]);
  // ...and specifically none of the customer's, in case a partial leak occurs.
  for (const name of customerWishlist) {
    expect(freshWishlist, `customer wishlist item "${name}" leaked into a fresh account`).not.toContain(name);
  }
  for (const id of customerOrders) {
    expect(freshOrders, `customer order ${id} leaked into a fresh account`).not.toContain(id);
  }

  await context.close();
});

test('guest items enter only the merging account, and never leak onward', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();

  // As a guest, save a product the customer does NOT have.
  await addGuestWishlist(page, NON_CUSTOMER_PRODUCT);

  // Register account A — the guest item merges in (the intended path).
  const emailA = `mergeA_${Date.now()}@example.com`;
  await registerUI(page, 'Merge A', emailA, 'password123');
  const aWishlist = await wishlistNames(page);
  expect(aWishlist.length, 'account A should receive exactly the one merged guest item').toBe(1);
  const mergedItem = aWishlist[0];

  // Log out of A and into the customer. The guest store was consumed by A's
  // merge, so A's item must NOT appear for the customer (the ad502fe path:
  // A's logout leaking its wishlist into the guest store → customer's merge).
  await logoutUI(page);
  await loginUI(page, CUSTOMER.email, CUSTOMER.password);
  const customerWishlist = await wishlistNames(page);
  expect(customerWishlist, `account A's item "${mergedItem}" leaked into the customer`).not.toContain(mergedItem);

  // Log out of the customer and register account B (no guest activity): empty.
  await logoutUI(page);
  const emailB = `mergeB_${Date.now()}@example.com`;
  await registerUI(page, 'Merge B', emailB, 'password123');
  const bWishlist = await wishlistNames(page);
  expect(bWishlist, 'a fresh account with no guest activity must be empty').toEqual([]);

  await context.close();
});
