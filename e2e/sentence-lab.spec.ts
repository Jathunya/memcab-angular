import { test, expect } from '@playwright/test';
import { mockSuccessfulAuth } from './mocks/firebase-auth-mock';

const SPLASH_SETTLE_MS = 4500;

/**
 * Sentence Lab's real backend is a Vercel serverless function
 * (api/generate-sentence.ts) that calls Groq with a server-side-only key.
 * This suite's webServer runs plain `ng serve` (see playwright.config.ts),
 * which does not serve /api at all -- so /api/generate-sentence is mocked
 * here at the network layer, same as the Firebase mocks. This keeps CI
 * runs fast, deterministic, and free of live LLM costs/non-determinism.
 *
 * A one-time real-backend pass (vercel dev + a real GROQ_API_KEY, exercising
 * the actual Groq call) was run manually during development and is not part
 * of this automated suite -- see docs/QA-TEST-SUITE.md §A.3 for the same
 * mocking-tradeoff note that applies to the Firebase mocks.
 */

async function mockGenerateSentenceSuccess(page: import('@playwright/test').Page) {
  await page.route('**/api/generate-sentence', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        term: 'brave',
        thai: 'กล้า',
        pronunciation: '/breɪv/',
        partOfSpeech: 'adjective',
        sentence: 'The firefighter was brave during the rescue.',
      }),
    });
  });
}

async function mockGenerateSentenceServerError(page: import('@playwright/test').Page) {
  await page.route('**/api/generate-sentence', async (route) => {
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Sentence generation is not configured on the server.' }),
    });
  });
}

test.describe('Sentence Lab (server-side Groq proxy)', () => {
  test.beforeEach(async ({ page }) => {
    await mockSuccessfulAuth(page, { uid: 'sentence-qa-uid', email: 'sentence-qa@example.com', displayName: 'Sentence QA' });

    await page.goto('/#/login');
    await page.waitForTimeout(SPLASH_SETTLE_MS);
    await page.getByLabel('Email').fill('sentence-qa@example.com');
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: 'Log in' }).click();
    await page.waitForURL('**/#/home');
    await page.waitForTimeout(1000);

    // The sidebar nav item and the home-page quick-link card both say
    // "Sentence Lab" -- scope to the sidebar's .nav-item specifically.
    await page.locator('a.nav-item:has-text("Sentence Lab")').click();
  });

  test('no client-side API-key panel exists -- the key lives server-side only', async ({ page }) => {
    await expect(page.getByText('Add your Groq API key')).toHaveCount(0);
    await expect(page.locator('.custom-input')).toBeVisible();
  });

  test('typing a word shows a loading state, then the generated result, calling /api/generate-sentence (not Groq directly)', async ({ page }) => {
    let calledPath = '';
    await page.route('**/api/generate-sentence', async (route) => {
      calledPath = new URL(route.request().url()).pathname;
      // A real Groq round trip takes long enough for the spinner to be
      // visible; route.fulfill() alone resolves near-instantly, which would
      // make the loading state unobservable -- add a small artificial delay
      // to actually exercise it, same technique as delaying any other mock
      // to test a UI's in-flight state.
      await new Promise((r) => setTimeout(r, 800));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          term: 'brave',
          thai: 'กล้า',
          pronunciation: '/breɪv/',
          partOfSpeech: 'adjective',
          sentence: 'The firefighter was brave during the rescue.',
        }),
      });
    });

    await page.locator('.custom-input').fill('brave');
    await page.getByRole('button', { name: 'AI Generate' }).click();

    await expect(page.locator('.generating')).toBeVisible();
    await expect(page.locator('.custom-result')).toBeVisible();

    expect(calledPath).toBe('/api/generate-sentence');
    await expect(page.locator('.thai.word')).toHaveText('กล้า');
    await expect(page.locator('.english')).toHaveText('The firefighter was brave during the rescue.');
    await expect(page.locator('.pronunciation')).toHaveText('/breɪv/');
  });

  test('a server-side failure (e.g. missing GROQ_API_KEY) shows a friendly error, not a raw one', async ({ page }) => {
    await mockGenerateSentenceServerError(page);

    await page.locator('.custom-input').fill('brave');
    await page.getByRole('button', { name: 'AI Generate' }).click();

    const err = page.locator('.custom-error');
    await expect(err).toBeVisible();
    await expect(err).toContainText('Could not generate sentence');
    await expect(page.locator('.custom-result')).toHaveCount(0);
  });

  test('submitting an empty term shows a validation message without calling the endpoint', async ({ page }) => {
    let requestMade = false;
    await page.route('**/api/generate-sentence', async (route) => {
      requestMade = true;
      await route.continue();
    });

    await page.getByRole('button', { name: 'AI Generate' }).click();

    await expect(page.locator('.custom-error')).toHaveText('⚠ Please type a word first.');
    expect(requestMade).toBe(false);
  });

  test('"Add to My Decks" opens the save-word modal pre-filled with the generated word', async ({ page }) => {
    await mockGenerateSentenceSuccess(page);

    await page.locator('.custom-input').fill('brave');
    await page.getByRole('button', { name: 'AI Generate' }).click();
    await expect(page.locator('.custom-result')).toBeVisible();

    await page.getByRole('button', { name: 'Add to My Decks' }).click();

    // app-save-word-modal's own host element has no intrinsic box (its
    // content is what's actually rendered) -- assert on that content instead.
    const modalPreview = page.locator('app-save-word-modal .preview');
    await expect(modalPreview).toBeVisible();
    await expect(modalPreview.locator('.thai.word')).toHaveText('กล้า');
    await expect(modalPreview.locator('.translation')).toHaveText('brave');
  });
});
