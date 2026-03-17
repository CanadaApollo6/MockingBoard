import { test, expect } from '@playwright/test';

test.describe('contract builder', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/contract-builder');
    await expect(
      page.getByRole('heading', { name: 'Contract Builder' }),
    ).toBeVisible();
  });

  test('defaults to Basic tier', async ({ page }) => {
    await expect(page.getByText('Year 1 Cap Hit')).toBeVisible();
    await expect(page.getByText('Signing Bonus Proration')).toBeVisible();
  });

  test('switching between tiers via tabs', async ({ page }) => {
    // Switch to Standard
    await page.getByRole('tab', { name: 'Standard' }).click();
    await expect(page.getByText('Cap Hit Breakdown')).toBeVisible();

    // Switch to Advanced
    await page.getByRole('tab', { name: 'Advanced' }).click();
    await expect(page.getByText('Year-by-Year Salaries')).toBeVisible();

    // Switch back to Basic
    await page.getByRole('tab', { name: 'Basic' }).click();
    await expect(page.getByText('Year 1 Cap Hit')).toBeVisible();
  });

  test('Basic tier shows proration schedule', async ({ page }) => {
    // Default is 4-year contract — should show 4 proration years
    await expect(page.getByText('2026')).toBeVisible();
    await expect(page.getByText('2029')).toBeVisible();
  });

  test('Standard tier shows dead money preview', async ({ page }) => {
    await page.getByRole('tab', { name: 'Standard' }).click();
    await expect(page.getByText('Dead Money If Released')).toBeVisible();
    await expect(page.getByText('Pre-June 1')).toBeVisible();
    await expect(page.getByText('Post-June 1')).toBeVisible();
  });

  test('Advanced tier allows adding incentives', async ({ page }) => {
    await page.getByRole('tab', { name: 'Advanced' }).click();
    await expect(page.getByText('No incentives added')).toBeVisible();

    await page.getByRole('button', { name: 'Add Incentive' }).click();
    await expect(page.getByText('No incentives added')).not.toBeVisible();
    await expect(
      page.getByPlaceholder('e.g. Pro Bowl selection'),
    ).toBeVisible();
  });

  test('links to salary cap explainer', async ({ page }) => {
    await expect(page.getByRole('link', { name: /salary cap/i })).toBeVisible();
  });
});
