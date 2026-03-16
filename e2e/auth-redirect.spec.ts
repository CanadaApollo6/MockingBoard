import { test, expect } from '@playwright/test';

test('unauthenticated /settings redirects to /auth', async ({ page }) => {
  await page.goto('/settings');
  await expect(page).toHaveURL(/\/auth/);
});
