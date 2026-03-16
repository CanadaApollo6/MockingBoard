import { test, expect } from '@playwright/test';

test.describe('search dialog', () => {
  test('Ctrl+K opens the search dialog', async ({ page }) => {
    await page.goto('/prospects');

    await page.keyboard.press('Control+k');

    // Dialog should open with search input
    await expect(
      page.getByPlaceholder('Search players, teams, users...'),
    ).toBeVisible();
  });

  test('Escape closes the search dialog', async ({ page }) => {
    await page.goto('/prospects');

    await page.keyboard.press('Control+k');
    await expect(
      page.getByPlaceholder('Search players, teams, users...'),
    ).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(
      page.getByPlaceholder('Search players, teams, users...'),
    ).not.toBeVisible();
  });

  test('typing fewer than 2 characters shows no results', async ({ page }) => {
    await page.goto('/prospects');
    await page.keyboard.press('Control+k');

    const input = page.getByPlaceholder('Search players, teams, users...');
    await input.fill('a');

    // Should not show "No results found" or any result items
    await expect(page.getByText('No results found')).not.toBeVisible();
  });

  test('nonsense query shows "No results found"', async ({ page }) => {
    await page.goto('/prospects');
    await page.keyboard.press('Control+k');

    const input = page.getByPlaceholder('Search players, teams, users...');
    await input.fill('xyznonexistent999');

    // Wait for debounce + API response
    await expect(page.getByText('No results found')).toBeVisible({
      timeout: 5000,
    });
  });

  test('searching for a known team returns results', async ({ page }) => {
    await page.goto('/prospects');
    await page.keyboard.press('Control+k');

    const input = page.getByPlaceholder('Search players, teams, users...');
    await input.fill('Chiefs');

    // Wait for results — should show a "Teams" group label inside the dialog
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Teams')).toBeVisible({ timeout: 5000 });
  });
});
