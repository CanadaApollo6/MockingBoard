import { test, expect } from '@playwright/test';

test.describe('guest draft flow', () => {
  test('creates a guest draft through the UI', async ({ page }) => {
    await page.goto('/drafts/new');
    await expect(
      page.getByRole('heading', { name: 'New Mock Draft' }),
    ).toBeVisible();

    // Select a team (KC button in the team grid)
    await page.getByRole('button', { name: 'KC', exact: true }).click();

    // Submit — unauthenticated users see "Start Guest Draft"
    await page.getByRole('button', { name: 'Start Guest Draft' }).click();

    // Should redirect to the guest draft page
    await expect(page).toHaveURL(/\/drafts\/guest/);
  });

  test('guest draft room renders via direct navigation', async ({ page }) => {
    await page.goto(
      '/drafts/guest?year=2026&rounds=1&format=single-team&team=KC&cpuSpeed=instant',
    );

    // The draft room should render with a heading (draft display name)
    await expect(page.getByRole('heading').first()).toBeVisible({
      timeout: 15_000,
    });
  });
});
