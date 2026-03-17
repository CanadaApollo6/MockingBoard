import { test, expect } from '@playwright/test';

test.describe('salary cap explainer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/learn/salary-cap');
    await expect(
      page.getByRole('heading', { name: 'Salary Cap Explained' }),
    ).toBeVisible();
  });

  test('renders all section headings', async ({ page }) => {
    const sections = [
      'What Is the Salary Cap?',
      'Cap Hit Breakdown',
      'Signing Bonus Proration',
      'Rookie Wage Scale',
      'Dead Money',
      'Veteran Salary Benefit',
      'Franchise & Transition Tags',
      'Restructures',
      'Incentives',
    ];

    for (const section of sections) {
      await expect(page.getByRole('heading', { name: section })).toBeVisible();
    }
  });

  test('proration calculator shows results', async ({ page }) => {
    // The mini-proration calc should be visible with default values
    const calc = page.locator('#proration').locator('..');
    await expect(calc.getByText('Annual Cap Charge')).toBeVisible();
  });

  test('table of contents links exist on desktop', async ({ page }) => {
    // Desktop TOC should have navigation links
    await expect(page.getByText('On This Page')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Dead Money' })).toBeVisible();
  });

  test('links to contract builder', async ({ page }) => {
    await expect(
      page.getByRole('link', { name: /Contract Builder/i }),
    ).toBeVisible();
  });
});
