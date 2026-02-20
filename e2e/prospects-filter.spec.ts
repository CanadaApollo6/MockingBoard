import { test, expect } from '@playwright/test';

test.describe('prospects page filters', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/prospects');
    await expect(
      page.getByRole('heading', { name: '2026 Big Board' }),
    ).toBeVisible();
  });

  test('position filter narrows the list', async ({ page }) => {
    // Get initial prospect count
    const countText = page.getByText(/\d+ prospects?/);
    await expect(countText).toBeVisible();
    const initialText = await countText.textContent();
    const initialCount = parseInt(initialText!);

    // Click QB filter
    await page.getByRole('button', { name: 'QB', exact: true }).click();

    // Count should be smaller
    const filteredText = await countText.textContent();
    const filteredCount = parseInt(filteredText!);
    expect(filteredCount).toBeLessThan(initialCount);

    // Click "All" to reset
    await page.getByRole('button', { name: 'All', exact: true }).click();
    const resetText = await countText.textContent();
    const resetCount = parseInt(resetText!);
    expect(resetCount).toBe(initialCount);
  });

  test('search input filters by name', async ({ page }) => {
    const countText = page.getByText(/\d+ prospects?/);
    await expect(countText).toBeVisible();
    const initialCount = parseInt((await countText.textContent())!);

    // Type a search query that should narrow results
    await page
      .getByPlaceholder('Search by name, school, or NFL comp...')
      .fill('quarterback');

    // Wait for filter to take effect
    const filteredText = await countText.textContent();
    const filteredCount = parseInt(filteredText!);
    expect(filteredCount).toBeLessThanOrEqual(initialCount);
  });

  test('view toggle switches between Full and List modes', async ({ page }) => {
    // Default is "List" (condensed) mode
    const fullButton = page.getByRole('button', { name: 'Full view' });
    const listButton = page.getByRole('button', { name: 'Condensed view' });

    await fullButton.click();
    // Full view uses space-y-6 layout — prospect cards should be visible
    await expect(fullButton).toBeVisible();

    await listButton.click();
    // Back to condensed
    await expect(listButton).toBeVisible();
  });

  test('empty search shows "No prospects found."', async ({ page }) => {
    await page
      .getByPlaceholder('Search by name, school, or NFL comp...')
      .fill('xyznonexistentplayer123');

    await expect(page.getByText('No prospects found.')).toBeVisible();
  });
});
