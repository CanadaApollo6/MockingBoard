import { test, expect } from '@playwright/test';

test.describe('404 pages', () => {
  test('unknown route shows "Page Not Found"', async ({ page }) => {
    await page.goto('/this-route-does-not-exist-xyzzy');
    await expect(
      page.getByRole('heading', { name: 'Page Not Found' }),
    ).toBeVisible();
  });

  test('"Go Home" button navigates to /', async ({ page }) => {
    await page.goto('/this-route-does-not-exist-xyzzy');
    await page.getByRole('link', { name: 'Go Home' }).click();
    await expect(page).toHaveURL('/');
  });

  test('/scouts/nonexistent-slug shows 404', async ({ page }) => {
    await page.goto('/scouts/nonexistent-slug-xyzzy');
    await expect(
      page.getByRole('heading', { name: 'Page Not Found' }),
    ).toBeVisible();
  });

  test('/boards/nonexistent-slug shows 404', async ({ page }) => {
    await page.goto('/boards/nonexistent-slug-xyzzy');
    await expect(
      page.getByRole('heading', { name: 'Page Not Found' }),
    ).toBeVisible();
  });

  test('/drafts/nonexistent-id shows 404', async ({ page }) => {
    await page.goto('/drafts/nonexistent-draft-id-xyzzy');
    await expect(
      page.getByRole('heading', { name: 'Page Not Found' }),
    ).toBeVisible();
  });
});
