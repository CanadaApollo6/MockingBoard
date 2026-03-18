import { test as publicTest, expect as publicExpect } from '@playwright/test';
import { test, expect } from './fixtures';

const REDIRECT_TO_AUTH = [
  { path: '/tape-log', name: 'tape log' },
  { path: '/watchlist', name: 'watchlist' },
  { path: '/settings', name: 'settings' },
  { path: '/settings/profile', name: 'settings/profile' },
];

publicTest.describe('unauthenticated hard redirects', () => {
  for (const { path, name } of REDIRECT_TO_AUTH) {
    publicTest(`${name} redirects to /auth`, async ({ page }) => {
      await page.goto(path);
      await publicExpect(page).toHaveURL(/\/auth/);
    });
  }

  publicTest('/companion redirects to /', async ({ page }) => {
    await page.goto('/companion');
    await publicExpect(page).toHaveURL('/');
  });
});

test.describe('authenticated access to protected pages', () => {
  test('tape log loads', async ({ authenticatedPage: page }) => {
    await page.goto('/tape-log');
    await expect(page).toHaveURL(/\/tape-log/);
    await expect(page.getByRole('heading', { name: 'Tape Log' })).toBeVisible();

    const hasEntries =
      (await page.locator('a[href^="/prospects/"]').count()) > 0;
    const hasEmptyState =
      (await page.getByText('Start logging tape').count()) > 0;
    expect(hasEntries || hasEmptyState).toBe(true);
  });

  test('watchlist loads', async ({ authenticatedPage: page }) => {
    await page.goto('/watchlist');
    await expect(page).toHaveURL(/\/watchlist/);
    await expect(
      page.getByRole('heading', { name: 'Watchlist' }),
    ).toBeVisible();
  });

  test('companion loads', async ({ authenticatedPage: page }) => {
    await page.goto('/companion');
    await expect(page).toHaveURL(/\/companion/);
    await expect(
      page.getByRole('heading', { name: 'Draft Companion' }),
    ).toBeVisible();
  });
});
