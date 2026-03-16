import { test, expect } from '@playwright/test';

test.describe('trade calculator', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/trade-calculator');
    await expect(
      page.getByRole('heading', { name: 'Trade Calculator' }),
    ).toBeVisible();
  });

  test('model toggle switches between Trade Value and Surplus Value', async ({
    page,
  }) => {
    // Trade Value is default — description should mention "Rich Hill"
    await expect(page.getByText('Rich Hill trade value chart')).toBeVisible();

    await page.getByRole('button', { name: 'Surplus Value' }).click();
    await expect(page.getByText('Baldwin surplus value')).toBeVisible();

    await page.getByRole('button', { name: 'Trade Value' }).click();
    await expect(page.getByText('Rich Hill trade value chart')).toBeVisible();
  });

  test('adding a future pick shows it in the pick list', async ({ page }) => {
    // Both sides should initially show "No picks added"
    await expect(page.getByText('No picks added').first()).toBeVisible();

    // Click "Future Pick" on the first trade side
    await page.getByRole('button', { name: 'Future Pick' }).first().click();

    // Click "Rd 1" to add a first-round future pick
    await page.getByRole('button', { name: 'Rd 1' }).first().click();

    // The pick should now appear in the list — "No picks added" should be gone from the first side
    // and the pick label should be visible
    await expect(page.getByText(/Rd 1/).first()).toBeVisible();
  });

  test('adding picks to both sides shows comparison card with verdict', async ({
    page,
  }) => {
    // Add a future 1st round pick to side A
    await page.getByRole('button', { name: 'Future Pick' }).first().click();
    await page.getByRole('button', { name: 'Rd 1' }).first().click();

    // Add a future 7th round pick to side B
    await page.getByRole('button', { name: 'Future Pick' }).nth(1).click();
    await page.getByRole('button', { name: 'Rd 7' }).nth(1).click();

    // Verdict text should appear (a 1st vs 7th is a big gap)
    await expect(page.getByText(/advantage/i)).toBeVisible();

    // Net difference text should be visible
    await expect(page.getByText('Net difference')).toBeVisible();
  });

  test('Reset button clears both sides', async ({ page }) => {
    // Add a pick to trigger the Reset button
    await page.getByRole('button', { name: 'Future Pick' }).first().click();
    await page.getByRole('button', { name: 'Rd 1' }).first().click();

    // Reset should be visible and clickable
    await page.getByRole('button', { name: 'Reset' }).click();

    // Both sides should show "No picks added" again
    const noPicks = page.getByText('No picks added');
    await expect(noPicks.first()).toBeVisible();
    await expect(noPicks.nth(1)).toBeVisible();
  });
});
