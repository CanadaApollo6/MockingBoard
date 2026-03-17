import { test, expect } from '@playwright/test';

test.describe('discover page', () => {
  test('renders with heading and description', async ({ page }) => {
    await page.goto('/discover');
    await expect(page.getByRole('heading', { name: 'Discover' })).toBeVisible();
    await expect(page.getByText('Explore trending boards')).toBeVisible();
  });

  test('shows Trending Boards section', async ({ page }) => {
    await page.goto('/discover');
    await expect(
      page.getByRole('heading', { name: 'Trending Boards' }),
    ).toBeVisible();
  });

  test('shows Popular Reports section', async ({ page }) => {
    await page.goto('/discover');
    await expect(
      page.getByRole('heading', { name: 'Popular Reports' }),
    ).toBeVisible();
  });

  test('shows Top Scouts section', async ({ page }) => {
    await page.goto('/discover');
    await expect(
      page.getByRole('heading', { name: 'Top Scouts' }),
    ).toBeVisible();
  });

  test('shows Just Published section', async ({ page }) => {
    await page.goto('/discover');
    await expect(
      page.getByRole('heading', { name: 'Just Published' }),
    ).toBeVisible();
  });
});
