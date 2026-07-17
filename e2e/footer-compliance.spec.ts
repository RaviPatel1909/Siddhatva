import { test, expect } from '@playwright/test';

// Footer compliance / info pages: every footer policy link must resolve to a real
// page (no dead "#"), render its title, and — for the three legal drafts (Terms,
// Privacy, Refund) — show the working-draft notice. The three info pages (Contact,
// Shipping, Pricing) must NOT show it.
//
// No auth required — these pages are public. No seeded data needed.

const DRAFT_TEXT = /working draft pending final review/i;

// footer link label → { route, page heading, is a legal draft }
const PAGES = [
  { link: 'Contact Us', path: '/contact', heading: 'Contact Us', draft: false },
  { link: 'Shipping Policy', path: '/shipping-policy', heading: 'Shipping Policy', draft: false },
  { link: 'Pricing Policy', path: '/pricing-policy', heading: 'Pricing Policy', draft: false },
  { link: 'Cancellation & Refund', path: '/refund-policy', heading: 'Cancellation & Refund Policy', draft: true },
  { link: 'Privacy Policy', path: '/privacy', heading: 'Privacy Policy', draft: true },
  { link: 'Terms of Service', path: '/terms', heading: 'Terms & Conditions', draft: true },
];

for (const width of [375, 1280]) {
  test.describe(`footer compliance pages @ ${width}`, () => {
    test.use({ viewport: { width, height: 900 } });

    test('every footer policy link resolves and renders its page', async ({ page }) => {
      for (const p of PAGES) {
        await page.goto('/');
        // Scope to the footer landmark so we click the footer link, not any other.
        const footer = page.getByRole('contentinfo');
        await footer.getByRole('link', { name: p.link, exact: true }).click();

        await expect(page).toHaveURL(new RegExp(`${p.path}$`));
        await expect(page.getByRole('heading', { level: 1, name: p.heading })).toBeVisible({
          timeout: 10_000,
        });

        // Draft notice: present on the three legal pages, absent on the info pages.
        const notice = page.getByText(DRAFT_TEXT);
        if (p.draft) {
          await expect(notice).toBeVisible();
        } else {
          await expect(notice).toHaveCount(0);
        }
      }
    });
  });
}

test('no footer link points at a dead "#" anchor', async ({ page }) => {
  await page.goto('/');
  const hrefs = await page.getByRole('contentinfo').locator('a[href]').evaluateAll((els) =>
    els.map((el) => el.getAttribute('href'))
  );
  expect(hrefs.length).toBeGreaterThan(0);
  expect(hrefs).not.toContain('#');
});
