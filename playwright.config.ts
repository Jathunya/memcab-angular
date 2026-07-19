import { defineConfig, devices } from '@playwright/test';

const PORT = 4310;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  workers: process.env['CI'] ? 2 : undefined,
  reporter: process.env['CI'] ? [['html', { open: 'never' }], ['github']] : 'html',
  timeout: 30_000,

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  // Boots the real dev server for the suite; Firebase network calls made by
  // the pages under test are intercepted per-test via page.route() (see
  // e2e/mocks/firebase-auth-mock.ts) rather than hitting the live project --
  // deterministic and CI-safe, at the cost of the mocks needing to be kept
  // in sync with Identity Toolkit's wire format on major `firebase` upgrades.
  webServer: {
    command: `npx ng serve --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env['CI'],
    timeout: 120_000,
  },

  projects: [
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
