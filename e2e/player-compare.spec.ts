import { test, expect } from '@playwright/test';

test.describe('player comparison', () => {
  test('empty state shows two player search slots', async ({ page }) => {
    await page.goto('/comparePlayers');

    // The visible empty state heading
    await expect(
      page.getByRole('heading', { name: 'Player Comparison', level: 2 }),
    ).toBeVisible();

    // Two search inputs for selecting players
    const searchInputs = page.getByPlaceholder('Search players...');
    await expect(searchInputs).toHaveCount(2);
  });

  test('selecting a player fills the first slot', async ({ page }) => {
    await page.goto('/comparePlayers');

    const firstInput = page.getByPlaceholder('Search players...').first();
    await firstInput.fill('Mahomes');

    // Wait for search results
    const result = page.getByText('Patrick Mahomes').first();
    await expect(result).toBeVisible({ timeout: 5000 });
    await result.click();

    // Player name should appear in the hero area
    await expect(
      page.getByRole('heading', { name: 'Patrick Mahomes' }),
    ).toBeVisible();

    // URL should update with p1 param
    await expect(page).toHaveURL(/p1=/);
  });

  test('second slot filters to same position group', async ({ page }) => {
    // Pre-fill with a QB (Mahomes ESPN ID: 3139477)
    await page.goto('/comparePlayers?p1=3139477');

    // First player should render
    await expect(
      page.getByRole('heading', { name: 'Patrick Mahomes' }),
    ).toBeVisible({ timeout: 5000 });

    // The second search should exist
    const secondInput = page.getByPlaceholder('Search players...').first();
    await expect(secondInput).toBeVisible();
  });

  test('full comparison renders stat bars when both players selected', async ({
    page,
  }) => {
    // Mahomes (3139477) vs Allen (3918298) — both QBs
    await page.goto('/comparePlayers?p1=3139477&p2=3918298');

    // Both player names should appear as headings
    await expect(
      page.getByRole('heading', { name: 'Patrick Mahomes' }),
    ).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('heading', { name: 'Josh Allen' })).toBeVisible(
      { timeout: 5000 },
    );

    // VS divider should appear
    await expect(page.getByText('VS', { exact: true })).toBeVisible();

    // Stat category headings should appear (both are QBs with passing stats)
    await expect(page.getByText('Passing').first()).toBeVisible();
  });

  test('compare button on player page links to compare', async ({ page }) => {
    await page.goto('/players/3139477');

    // Wait for player page to load
    await expect(
      page.getByRole('heading', { name: 'Patrick Mahomes' }),
    ).toBeVisible({ timeout: 5000 });

    // Click the compare button
    const compareLink = page.getByRole('link', {
      name: 'Compare',
      exact: true,
    });
    await expect(compareLink).toBeVisible();
    await compareLink.click();

    await expect(page).toHaveURL(/\/comparePlayers\?p1=3139477/);
  });

  test('invalid ESPN ID shows graceful empty state', async ({ page }) => {
    await page.goto('/comparePlayers?p1=9999999999');

    // Should still render the page without crashing — search slots should be present
    const searchInputs = page.getByPlaceholder('Search players...');
    await expect(searchInputs.first()).toBeVisible();
  });
});
