import { test, expect } from '@playwright/test';

test.describe('auth pages', () => {
  test('/auth redirects to /auth/signin', async ({ page }) => {
    await page.goto('/auth');
    await expect(page).toHaveURL(/\/auth\/signin/);
  });

  test('sign-in form renders with expected fields', async ({ page }) => {
    await page.goto('/auth/signin');

    await expect(
      page.locator('[data-slot="card-title"]', { hasText: 'Sign In' }),
    ).toBeVisible();
    await expect(page.getByPlaceholder('you@example.com')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Sign In', exact: true }),
    ).toBeVisible();

    // OAuth buttons
    await expect(
      page.getByRole('link', { name: 'Sign in with Discord' }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Sign in with Google' }),
    ).toBeVisible();
  });

  test('Discord button links to /api/auth/discord', async ({ page }) => {
    await page.goto('/auth/signin');
    const discordLink = page.getByRole('link', {
      name: 'Sign in with Discord',
    });
    await expect(discordLink).toHaveAttribute('href', '/api/auth/discord');
  });

  test('"Create one" toggles to signup mode', async ({ page }) => {
    await page.goto('/auth/signin');

    // Display Name field should not be visible in signin mode
    await expect(page.getByPlaceholder('Your name')).not.toBeVisible();

    await page.getByRole('button', { name: 'Create one' }).click();

    // Should now show signup title and Display Name field
    await expect(
      page.locator('[data-slot="card-title"]', { hasText: 'Create Account' }),
    ).toBeVisible();
    await expect(page.getByPlaceholder('Your name')).toBeVisible();
  });

  test('"Sign in" link toggles back to signin mode', async ({ page }) => {
    await page.goto('/auth/signin');
    await page.getByRole('button', { name: 'Create one' }).click();
    await expect(page.getByPlaceholder('Your name')).toBeVisible();

    await page.getByRole('button', { name: 'Sign in', exact: true }).click();

    await expect(
      page.locator('[data-slot="card-title"]', { hasText: 'Sign In' }),
    ).toBeVisible();
    await expect(page.getByPlaceholder('Your name')).not.toBeVisible();
  });
});
