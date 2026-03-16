import { test, expect } from '@playwright/test';

test.describe('landing page', () => {
  test('renders hero with MockingBoard heading', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: 'MockingBoard' }),
    ).toBeVisible();
  });

  test('"Mock Draft Now" navigates to /drafts/new', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Mock Draft Now' }).click();
    await expect(page).toHaveURL(/\/drafts\/new/);
  });

  test('"Sign In" button swaps to auth form', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Auth form card should appear with "Sign In" title
    await expect(
      page.locator('[data-slot="card-title"]', { hasText: 'Sign In' }),
    ).toBeVisible();

    // Feature cards should be gone
    await expect(page.getByText('Draft in Discord')).not.toBeVisible();
  });

  test('"Create Account" button shows signup form', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Create Account' }).click();

    // Auth form should be in signup mode
    await expect(
      page.locator('[data-slot="card-title"]', { hasText: 'Create Account' }),
    ).toBeVisible();

    // Display Name field should be present
    await expect(page.getByPlaceholder('Your name')).toBeVisible();
  });

  test('"Back" button returns to hero view', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(
      page.locator('[data-slot="card-title"]', { hasText: 'Sign In' }),
    ).toBeVisible();

    await page.getByRole('button', { name: 'Back' }).click();

    // Hero heading and feature cards should reappear
    await expect(
      page.getByRole('heading', { name: 'MockingBoard' }),
    ).toBeVisible();
    await expect(page.getByText('Draft in Discord')).toBeVisible();
  });

  test('feature cards are visible', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Draft in Discord')).toBeVisible();
    await expect(page.getByText('Draft on the Web')).toBeVisible();
    await expect(page.getByText('Track Your History')).toBeVisible();
  });
});
