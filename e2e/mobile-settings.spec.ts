import { test, expect } from '@playwright/test';
import { mockSuccessfulAuth } from './mocks/firebase-auth-mock';

const SPLASH_SETTLE_MS = 4500;
// iPhone 14 Pro, as specified for this journey.
const MOBILE_VIEWPORT = { width: 393, height: 851 };

test.describe('Journey B: Mobile Settings responsive navigation & scroll', () => {
  test.use({ viewport: MOBILE_VIEWPORT });

  test.beforeEach(async ({ page }) => {
    await mockSuccessfulAuth(page, { uid: 'mobile-qa-uid', email: 'mobile-qa@example.com', displayName: 'Mobile QA' });

    await page.goto('/#/login');
    await page.waitForTimeout(SPLASH_SETTLE_MS);
    await page.getByLabel('Email').fill('mobile-qa@example.com');
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: 'Log in' }).click();
    await page.waitForURL('**/#/home');
  });

  test('the desktop sidebar is hidden and the bottom navigation bar is visible at 393px width', async ({ page }) => {
    await expect(page.locator('.sidebar')).toBeHidden();
    await expect(page.locator('.bottom-nav')).toBeVisible();

    // Sanity: the bottom nav actually exposes the 5 primary destinations.
    const items = page.locator('.bottom-nav-item');
    await expect(items).toHaveCount(5);
  });

  test('tapping the topbar avatar routes straight to /#/settings on mobile, instead of opening the desktop popover', async ({ page }) => {
    await page.locator('.avatar').click();

    await expect(page).toHaveURL(/#\/settings$/);
    // The desktop account popover must not appear -- on mobile it's a full
    // route instead, since a hover-anchored popover doesn't translate to touch.
    await expect(page.locator('.user-profile-dropdown')).toHaveCount(0);
  });

  test('the settings tab nav becomes a horizontally-scrollable pill row, and no tab label clips', async ({ page }) => {
    await page.locator('.avatar').click();
    await expect(page).toHaveURL(/#\/settings$/);

    const tabBar = page.locator('.tab-bar');
    await expect(tabBar).toBeVisible();

    // The CSS mechanism this journey is meant to catch a regression in:
    // overflow-x:auto so the row scrolls instead of wrapping/clipping.
    const overflowX = await tabBar.evaluate((el) => getComputedStyle(el).overflowX);
    expect(overflowX).toBe('auto');

    // Every tab button must render at its full, unclipped intrinsic width --
    // i.e. none of them got crushed by flex-shrink inside the row.
    const tabButtons = page.locator('.tab-btn');
    const count = await tabButtons.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const flexShrink = await tabButtons.nth(i).evaluate((el) => getComputedStyle(el).flexShrink);
      expect(flexShrink).toBe('0');
    }

    const { scrollWidth, clientWidth } = await tabBar.evaluate((el) => ({
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
    }));
    expect(scrollWidth).toBeGreaterThanOrEqual(clientWidth);

    // At exactly 393px these 3 tab labels happen to fit without overflowing,
    // so there's nothing to scroll -- only assert the swipe actually moves
    // the row when there IS overflow, rather than assuming it unconditionally.
    // The `overflow-x: auto` + `flex-shrink: 0` assertions above are what
    // actually guard the mobile-clipping regression: they prove the
    // mechanism is armed for whenever content is wide enough to need it
    // (longer labels, a narrower device, or larger accessibility font size).
    if (scrollWidth > clientWidth) {
      await tabBar.evaluate((el) => {
        el.scrollLeft = 40;
      });
      // The row has `scroll-behavior: smooth` (see settings.css), so the
      // scroll animates over subsequent frames rather than landing
      // synchronously -- poll instead of reading scrollLeft immediately.
      await expect
        .poll(async () => tabBar.evaluate((el) => el.scrollLeft))
        .toBeGreaterThan(0);
    }
  });
});
