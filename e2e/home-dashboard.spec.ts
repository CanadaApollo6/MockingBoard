import { test as publicTest, expect as publicExpect } from '@playwright/test';
import { test, expect } from './fixtures';

publicTest('unauthenticated home renders landing hero', async ({ page }) => {
  await page.goto('/');
  await publicExpect(page.getByRole('heading').first()).toBeVisible();
  await publicExpect(page.getByText('Welcome back')).not.toBeVisible();
});

test.describe('authenticated home page', () => {
  test('renders Dashboard with welcome greeting', async ({
    authenticatedPage: page,
  }) => {
    await page.goto('/');
    // Dashboard is server-rendered but depends on data fetching
    await expect(page.getByText(/Welcome back/)).toBeVisible({
      timeout: 15_000,
    });
  });

  test('shows New Draft quick action', async ({ authenticatedPage: page }) => {
    await page.goto('/');
    await expect(page.locator('a[href="/drafts/new"]')).toBeVisible({
      timeout: 15_000,
    });
  });

  test('shows My Board quick action', async ({ authenticatedPage: page }) => {
    await page.goto('/');
    await expect(page.locator('a[href="/board"]')).toBeVisible({
      timeout: 15_000,
    });
  });

  test('notification bell renders', async ({ authenticatedPage: page }) => {
    await page.goto('/');
    // NotificationBell waits for useAuth() to hydrate
    await expect(
      page.getByRole('button', { name: 'Notifications' }),
    ).toBeVisible({ timeout: 15_000 });
  });
});
