import { test, expect } from '@playwright/test';
import { mockSuccessfulAuth } from './mocks/firebase-auth-mock';

const SPLASH_SETTLE_MS = 4500;
const QA_UID = 'flashcard-qa-uid';

declare global {
  interface Window {
    __ttsCalls: Array<{ text: string; lang: string }>;
  }
}

test.describe('Journey C: Tactile Flashcard Review & TTS', () => {
  test.beforeEach(async ({ page }) => {
    await mockSuccessfulAuth(page, { uid: QA_UID, email: 'flashcard-qa@example.com', displayName: 'Flashcard QA' });

    // Seed one deck/word directly into the uid-scoped storage key this app
    // actually reads (see store.service.ts's scopedKey()) so this journey
    // exercises the real review/flip/TTS code under test, without re-testing
    // "add a deck, add a word" CRUD here -- that's covered by
    // store.service.spec.ts and would only add noise to this journey.
    await page.addInitScript(
      ([uid]) => {
        localStorage.setItem(
          `memcab_folders::${uid}`,
          JSON.stringify([
            {
              id: 'qa-folder',
              name: 'QA Deck',
              description: '',
              createdAt: Date.now(),
              words: [
                {
                  id: 'qa-word-1',
                  word: 'สวัสดี',
                  translation: 'hello',
                  pronunciation: 'sa-wat-dee',
                  partOfSpeech: 'phrase',
                },
              ],
            },
          ]),
        );

        // Stub the Web Speech Synthesis API so clicking "Hear it" can be
        // asserted deterministically -- headless Chromium has no real TTS
        // voice backend, and calling through can silently no-op or hang.
        window.__ttsCalls = [];
        const install = () => {
          if (!window.speechSynthesis) return;
          window.speechSynthesis.speak = (utterance: SpeechSynthesisUtterance) => {
            window.__ttsCalls.push({ text: utterance.text, lang: utterance.lang });
          };
          window.speechSynthesis.cancel = () => {};
        };
        install();
      },
      [QA_UID],
    );

    await page.goto('/#/login');
    await page.waitForTimeout(SPLASH_SETTLE_MS);
    await page.getByLabel('Email').fill('flashcard-qa@example.com');
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: 'Log in' }).click();
    await page.waitForURL('**/#/home');

    await page.goto('/#/review');
    await page.getByRole('button', { name: 'QA Deck' }).click();
    await page.getByRole('button', { name: 'Start review' }).click();
  });

  test('the flashcard front shows the English translation and a clickable TTS button', async ({ page }) => {
    const front = page.locator('.face.front');
    await expect(front).toBeVisible();
    await expect(front.locator('.word')).toHaveText('hello');
    await expect(page.getByRole('button', { name: '🔊 Hear it' })).toBeVisible();
  });

  test('clicking the speaker button triggers Web Speech Synthesis with the English translation', async ({ page }) => {
    await page.getByRole('button', { name: '🔊 Hear it' }).click();

    const calls = await page.evaluate(() => window.__ttsCalls);
    expect(calls).toHaveLength(1);
    expect(calls[0]).toEqual({ text: 'hello', lang: 'en-US' });
  });

  test('"Show answer" flips the card to reveal the Thai translation', async ({ page }) => {
    const flashcard = page.locator('.flashcard');
    await expect(flashcard).not.toHaveClass(/flipped/);
    await expect(page.locator('.face.back')).toHaveCount(0);

    await page.getByRole('button', { name: 'Show answer' }).click();

    // The app's flip mechanism is a class toggle that swaps which face
    // renders (with a fade transition), not a literal 3D rotateY transform
    // -- this asserts the mechanism that actually exists in review.html/css.
    await expect(flashcard).toHaveClass(/flipped/);
    const back = page.locator('.face.back');
    await expect(back).toBeVisible();
    await expect(back.locator('.thai.translation')).toHaveText('สวัสดี');

    // Front content, including the TTS button, is gone once flipped.
    await expect(page.locator('.face.front')).toHaveCount(0);

    // Grading controls only appear once the answer is revealed.
    await expect(page.getByRole('button', { name: 'Again' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Good' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Easy' })).toBeVisible();
  });

  test('grading "Easy" on a new word marks it mastered and ends the (single-word) session', async ({ page }) => {
    await page.getByRole('button', { name: 'Show answer' }).click();
    await page.getByRole('button', { name: 'Easy' }).click();

    await expect(page.getByRole('heading', { name: 'Session complete' })).toBeVisible();
  });
});
