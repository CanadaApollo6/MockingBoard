import { test, expect } from '@playwright/test';

test.describe('nfl draft explainer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/learn/nfl-draft');
    await expect(
      page.getByRole('heading', { name: 'NFL Draft Explained' }),
    ).toBeVisible();
  });

  test('renders all section headings', async ({ page }) => {
    const sections = [
      'How the Draft Works',
      'Draft Order',
      'Trading Picks',
      'Compensatory Picks',
      'Rookie Contracts',
      'Undrafted Free Agents',
      'Forfeited Picks',
      'Declaring for the Draft',
      'The Combine & Pro Days',
    ];

    for (const section of sections) {
      await expect(
        page.getByRole('heading', { name: section }),
      ).toBeVisible();
    }
  });

  test('table of contents links exist on desktop', async ({ page }) => {
    await expect(page.getByText('On This Page')).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Trading Picks' }),
    ).toBeVisible();
  });

  test('links to draft order page', async ({ page }) => {
    await expect(
      page.getByRole('link', { name: /current draft order/i }),
    ).toBeVisible();
  });

  test('links to trade calculator', async ({ page }) => {
    await expect(
      page.getByRole('link', { name: /trade calculator/i }),
    ).toBeVisible();
  });

  test('links to start a mock draft', async ({ page }) => {
    await expect(
      page.getByRole('link', { name: /mock draft/i }),
    ).toBeVisible();
  });
});
