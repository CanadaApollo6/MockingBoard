import { test, expect } from '@playwright/test';

test.describe('invite page', () => {
  test('renders with correct heading', async ({ page }) => {
    await page.goto('/invite');
    await expect(
      page.getByRole('heading', { name: 'Add MockingBoard to Discord' }),
    ).toBeVisible();
  });

  test('"Add to Discord" link opens in new tab', async ({ page }) => {
    await page.goto('/invite');
    const discordLink = page.getByRole('link', { name: 'Add to Discord' });

    await expect(discordLink).toHaveAttribute('target', '_blank');
    await expect(discordLink).toHaveAttribute(
      'href',
      /discord\.com\/oauth2\/authorize/,
    );
  });

  test('"Draft on Web" navigates to /drafts/new', async ({ page }) => {
    await page.goto('/invite');
    await page.getByRole('link', { name: 'Draft on Web' }).click();
    await expect(page).toHaveURL(/\/drafts\/new/);
  });

  test('feature cards are visible', async ({ page }) => {
    await page.goto('/invite');
    await expect(page.getByText('Draft in Discord')).toBeVisible();
    await expect(page.getByText('CPU Opponents')).toBeVisible();
    await expect(page.getByText('Live Trades')).toBeVisible();
    await expect(page.getByText('Draft History')).toBeVisible();
  });
});
