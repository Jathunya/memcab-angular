import type { Page } from '@playwright/test';

/**
 * Intercepts the Firebase Identity Toolkit REST endpoints the `firebase/auth`
 * modular SDK calls under the hood, so E2E specs can drive real UI/app code
 * against deterministic, offline responses instead of a live Firebase
 * project. This keeps the suite fast, free of flakiness from real network
 * latency/rate limits, and safe to run in CI without real credentials.
 *
 * Tradeoff, stated plainly: these fixtures reproduce Identity Toolkit's
 * public wire format as observed with `firebase@^12.16.0`. It is not a
 * documented-stable contract -- if a future SDK major version changes how
 * it parses these responses, these mocks may need updating. For a periodic
 * sanity check that the real integration still works end-to-end, pair this
 * suite with a scheduled smoke test against a real (non-production) Firebase
 * project rather than relying on mocks alone.
 */

const IDENTITY_TOOLKIT = '**/identitytoolkit.googleapis.com/v1/accounts:*';

function fakeIdToken(uid: string): string {
  const b64url = (obj: unknown) =>
    Buffer.from(JSON.stringify(obj)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const header = b64url({ alg: 'none', typ: 'JWT' });
  const payload = b64url({
    sub: uid,
    user_id: uid,
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000),
  });
  return `${header}.${payload}.mock-signature`;
}

export interface MockUser {
  uid: string;
  email: string;
  displayName?: string;
}

/** Makes the next sign-in (or sign-up) call succeed as `user`. */
export async function mockSuccessfulAuth(page: Page, user: MockUser): Promise<void> {
  await page.route(IDENTITY_TOOLKIT, async (route) => {
    const url = route.request().url();

    if (url.includes(':signInWithPassword') || url.includes(':signUp')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          kind: 'identitytoolkit#VerifyPasswordResponse',
          localId: user.uid,
          email: user.email,
          displayName: user.displayName ?? '',
          idToken: fakeIdToken(user.uid),
          registered: true,
          refreshToken: 'mock-refresh-token',
          expiresIn: '3600',
        }),
      });
      return;
    }

    if (url.includes(':lookup')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          kind: 'identitytoolkit#GetAccountInfoResponse',
          users: [
            {
              localId: user.uid,
              email: user.email,
              displayName: user.displayName ?? '',
              emailVerified: true,
              providerUserInfo: [],
            },
          ],
        }),
      });
      return;
    }

    await route.continue();
  });
}

/** Makes the next sendOobCode (password reset email) call succeed. */
export async function mockPasswordResetSuccess(page: Page): Promise<void> {
  await page.route(`${IDENTITY_TOOLKIT.replace(':*', ':sendOobCode')}*`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ kind: 'identitytoolkit#GetOobConfirmationCodeResponse', email: 'unused@example.com' }),
    });
  });
}

/** Makes the next Identity Toolkit call for `endpoint` (e.g. "sendOobCode", "signInWithPassword") fail with `message`. */
export async function mockAuthError(page: Page, endpoint: string, message: string): Promise<void> {
  await page.route(`${IDENTITY_TOOLKIT.replace(':*', `:${endpoint}`)}*`, async (route) => {
    await route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({
        error: { code: 400, message, errors: [{ message, domain: 'global', reason: 'invalid' }] },
      }),
    });
  });
}
