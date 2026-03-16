import { test, expect } from '@playwright/test';

test.describe('teams directory', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/teams');
    await expect(
      page.getByRole('heading', { name: 'NFL Teams' }),
    ).toBeVisible();
  });

  test('conference filter shows only AFC teams', async ({ page }) => {
    await page.getByRole('button', { name: 'AFC', exact: true }).click();

    // AFC teams should be visible
    await expect(page.getByText('AFC North').first()).toBeVisible();

    // NFC teams should not be visible
    await expect(page.getByText('NFC North')).not.toBeVisible();
  });

  test('conference filter shows only NFC teams', async ({ page }) => {
    await page.getByRole('button', { name: 'NFC', exact: true }).click();

    await expect(page.getByText('NFC North').first()).toBeVisible();
    await expect(page.getByText('AFC North')).not.toBeVisible();
  });

  test('division filter narrows results', async ({ page }) => {
    // Filter to AFC first
    await page.getByRole('button', { name: 'AFC', exact: true }).click();

    // Then filter to North
    await page.getByRole('button', { name: 'North', exact: true }).click();

    // AFC North teams should be visible (e.g., Ravens, Bengals, Browns, Steelers)
    await expect(page.getByText('AFC North').first()).toBeVisible();

    // AFC South teams should not be visible
    await expect(page.getByText('AFC South')).not.toBeVisible();
  });

  test('"All" buttons reset filters', async ({ page }) => {
    // Apply filters
    await page.getByRole('button', { name: 'AFC', exact: true }).click();
    await page.getByRole('button', { name: 'North', exact: true }).click();

    // Reset conference
    await page
      .getByRole('button', { name: 'All', exact: true })
      .first()
      .click();

    // Reset division
    await page.getByRole('button', { name: 'All', exact: true }).nth(1).click();

    // All teams should be visible again — both AFC and NFC
    await expect(page.getByText('AFC North').first()).toBeVisible();
    await expect(page.getByText('NFC North').first()).toBeVisible();
  });

  test('team card links to /teams/[abbreviation]', async ({ page }) => {
    // Click on a team card (Kansas City Chiefs)
    const teamCard = page
      .getByRole('heading', { name: 'Kansas City Chiefs' })
      .first();
    await expect(teamCard).toBeVisible();
    await teamCard.click();

    await expect(page).toHaveURL(/\/teams\/KC/);
  });
});
