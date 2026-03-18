import { test as base, expect, type Page } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH_FILE = path.join(__dirname, '.auth', 'user.json');
const TOKEN_FILE = path.join(__dirname, '.auth', 'token.txt');

/**
 * Custom test fixtures for MockingBoard E2E tests.
 *
 * Default `page` is unauthenticated (all existing tests stay unchanged).
 * Use `authenticatedPage` for tests that need a logged-in session.
 *
 * The fixture loads saved cookies (for server-side auth) and then navigates
 * through the auth callback to restore client-side Firebase Auth (IndexedDB),
 * which isn't captured by Playwright's storageState.
 */
export const test = base.extend<{ authenticatedPage: Page }>({
  authenticatedPage: async ({ browser }, use) => {
    const context = await browser.newContext({ storageState: AUTH_FILE });
    const page = await context.newPage();

    // Restore client-side Firebase Auth by signing in via the auth callback.
    // This is needed because storageState doesn't capture IndexedDB.
    if (fs.existsSync(TOKEN_FILE)) {
      const token = fs.readFileSync(TOKEN_FILE, 'utf-8').trim();
      await page.goto(`/auth/callback?token=${token}`);
      await page.waitForFunction(
        () => !window.location.pathname.startsWith('/auth/callback'),
        { timeout: 15_000 },
      );
    }

    await use(page);
    await context.close();
  },
});

export { expect };
