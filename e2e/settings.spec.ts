import { test, expect, Page } from '@playwright/test';
import { CUSTOMER } from './testCredentials';

// Settings page (/account/profile). Guards that the page shows the REAL signed-in
// account (from /auth/me) rather than the old static mock, that the five setting
// groups render, that the Reduce-motion preference toggles + persists, and that
// the password "Send reset link" wires to the real forgot-password flow.
//
// Prerequisite: seeded database (see e2e/README.md). One UI login only — the
// suite shares a per-IP login rate-limit budget, so this spec signs in once and
// runs every check inside it. "Send reset link" only emails a link (dev mailbox);
// it does NOT change the password or revoke sessions, so the seed account stays
// usable for the other specs.

const accountMenu = (page: Page) => page.getByRole('button', { name: 'Account menu' });

async function loginUI(page: Page): Promise<void> {
  await page.goto('/login');
  await page.locator('input[name="email"]').fill(CUSTOMER.email);
  await page.locator('input[name="password"]').fill(CUSTOMER.password);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await expect(accountMenu(page)).toBeVisible({ timeout: 10_000 });
}

test('Settings exposes real account data, the reset flow, and the motion preference', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await loginUI(page);
  await page.goto('/account/profile');

  // Heading + real identity from /auth/me — specifically NOT the removed static
  // mock, which hardcoded alexander@siddhatva.com regardless of who signed in.
  await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible();
  await expect(page.getByText(CUSTOMER.email).first()).toBeVisible();
  await expect(page.getByText('alexander@siddhatva.com')).toHaveCount(0);

  // All five groups render (scope to <main> — the sidebar also has "Account").
  const main = page.getByRole('main');
  for (const heading of ['Account', 'Security', 'Notifications', 'Preferences', 'Privacy']) {
    await expect(main.getByRole('heading', { name: heading, level: 2 })).toBeVisible();
  }

  // Reduce-motion preference toggles, applies to <html>, and persists a reload.
  const html = page.locator('html');
  await expect(html).not.toHaveAttribute('data-reduce-motion', 'true');
  await page.getByRole('switch', { name: 'Reduce motion' }).click();
  await expect(html).toHaveAttribute('data-reduce-motion', 'true');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-reduce-motion', 'true');

  // Mobile (375) stays usable — key controls remain visible.
  await page.setViewportSize({ width: 375, height: 800 });
  await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible();
  await expect(page.getByRole('switch', { name: 'Reduce motion' })).toBeVisible();

  // Real, enumeration-safe password-reset flow (no invented change-password API).
  await page.getByRole('button', { name: 'Send reset link' }).click();
  await expect(page.getByText('Check your inbox')).toBeVisible({ timeout: 10_000 });
});
