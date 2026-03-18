import { test, expect } from './fixtures';

test.describe('draft creator — authenticated user', () => {
  test('shows Start Draft instead of Start Guest Draft', async ({
    authenticatedPage: page,
  }) => {
    await page.goto('/drafts/new');
    // DraftCreator is a client component — wait for auth hydration
    await expect(page.getByRole('button', { name: 'Start Draft' })).toBeVisible(
      { timeout: 15_000 },
    );
    await expect(
      page.getByRole('button', { name: 'Start Guest Draft' }),
    ).not.toBeVisible();
  });

  test('team grid renders', async ({ authenticatedPage: page }) => {
    await page.goto('/drafts/new');
    await expect(
      page.getByRole('button', { name: 'KC', exact: true }),
    ).toBeVisible({ timeout: 15_000 });
  });

  test('selecting a team keeps Start Draft enabled', async ({
    authenticatedPage: page,
  }) => {
    await page.goto('/drafts/new');
    // Wait for hydration
    await expect(
      page.getByRole('button', { name: 'KC', exact: true }),
    ).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: 'KC', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Start Draft' }),
    ).toBeEnabled();
  });
});
