import { test, expect } from '@playwright/test';
import { mockAuthError, mockPasswordResetSuccess } from './mocks/firebase-auth-mock';

// Splash screen (see App.FALLBACK_DISMISS_MS) covers the app on first load
// in a fresh browser context; wait it out once per test rather than fighting
// it with tighter timeouts everywhere else.
const SPLASH_SETTLE_MS = 4500;

test.describe('Journey A: Login & Reset Password flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#/login');
    await page.waitForTimeout(SPLASH_SETTLE_MS);
  });

  test('clicking "Forgot password?" swaps the card in place, without navigating away from /login', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();

    await page.getByRole('button', { name: 'Forgot password?' }).click();

    await expect(page.getByRole('heading', { name: 'Reset Password' })).toBeVisible();
    // Same route the whole time -- this is an in-component state swap
    // (isResettingPassword signal), not a router navigation to a new page.
    await expect(page).toHaveURL(/#\/login$/);

    // "Back to Log In" swaps it back.
    await page.getByRole('button', { name: '← Back to Log In' }).click();
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  });

  test('pre-populates the reset email from whatever was typed on the login form', async ({ page }) => {
    await page.getByLabel('Email').fill('learner@example.com');
    await page.getByRole('button', { name: 'Forgot password?' }).click();

    await expect(page.locator('#reset-email')).toHaveValue('learner@example.com');
  });

  test('an email Firebase rejects as invalid shows a red-styled visual alert', async ({ page }) => {
    await mockAuthError(page, 'sendOobCode', 'INVALID_EMAIL');

    await page.getByRole('button', { name: 'Forgot password?' }).click();
    await page.locator('#reset-email').fill('not-a-real-address@example.com');
    await page.getByRole('button', { name: 'Send reset link' }).click();

    const alert = page.locator('.form-error');
    await expect(alert).toBeVisible();
    await expect(alert).toHaveText('Please enter a valid email address.');

    // "Red visual alert" isn't just a label -- verify it's actually styled
    // as an error (coral/red token), not merely present in the DOM.
    const color = await alert.evaluate((el) => getComputedStyle(el).color);
    const [r, g, b] = color.match(/\d+/g)!.map(Number);
    expect(r).toBeGreaterThan(g);
    expect(r).toBeGreaterThan(b);
  });

  test('mocking a successful Firebase password reset dispatch shows the success banner', async ({ page }) => {
    await mockPasswordResetSuccess(page);

    await page.getByRole('button', { name: 'Forgot password?' }).click();
    await page.locator('#reset-email').fill('learner@example.com');
    await page.getByRole('button', { name: 'Send reset link' }).click();

    const banner = page.locator('.alert-success-banner');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText('Password reset link sent');

    // Submitting again should re-issue the request (not get stuck disabled).
    await expect(page.getByRole('button', { name: 'Send reset link' })).toBeEnabled();
  });

  test('the Send reset link button is disabled while the email field is empty', async ({ page }) => {
    await page.getByRole('button', { name: 'Forgot password?' }).click();
    await expect(page.getByRole('button', { name: 'Send reset link' })).toBeDisabled();

    await page.locator('#reset-email').fill('x@example.com');
    await expect(page.getByRole('button', { name: 'Send reset link' })).toBeEnabled();
  });
});
