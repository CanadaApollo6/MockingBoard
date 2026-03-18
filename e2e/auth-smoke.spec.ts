import { test, expect } from './fixtures';

test('authenticated user can access /settings', async ({
  authenticatedPage: page,
}) => {
  await page.goto('/settings');
  // Should NOT redirect to /auth — stays on settings
  await expect(page).toHaveURL(/\/settings/);
  // Settings page should render the profile heading
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

test('authenticated user can access /watchlist', async ({
  authenticatedPage: page,
}) => {
  await page.goto('/watchlist');
  // Should NOT redirect to /auth/signin — stays on watchlist
  await expect(page).toHaveURL(/\/watchlist/);
  await expect(page.getByRole('heading', { name: 'Watchlist' })).toBeVisible();
});
