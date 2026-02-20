import { test, expect } from '@playwright/test';

test.describe('navigation', () => {
  test.describe('desktop sidebar', () => {
    test('sidebar is visible on desktop viewport', async ({ page }) => {
      // Desktop viewport (default Playwright viewport is 1280x720)
      await page.goto('/prospects');

      // Sidebar should show the MockingBoard logo/link
      await expect(
        page.locator('aside').getByRole('link', { name: 'MockingBoard' }),
      ).toBeVisible();

      // Key nav links should be present
      await expect(
        page.locator('aside').getByRole('link', { name: 'Home' }),
      ).toBeVisible();
      await expect(
        page.locator('aside').getByRole('link', { name: 'Prospects' }),
      ).toBeVisible();
      await expect(
        page.locator('aside').getByRole('link', { name: 'Trade Calculator' }),
      ).toBeVisible();
    });

    test('"Sign In" link is visible for unauthenticated users', async ({
      page,
    }) => {
      await page.goto('/prospects');
      await expect(
        page.locator('aside').getByRole('link', { name: 'Sign In' }),
      ).toBeVisible();
    });

    test('search button is in the sidebar', async ({ page }) => {
      await page.goto('/prospects');
      await expect(
        page.locator('aside').getByRole('button', { name: 'Search' }),
      ).toBeVisible();
    });
  });

  test.describe('mobile navigation', () => {
    test.use({ viewport: { width: 375, height: 812 } });

    test('hamburger menu opens mobile sidebar', async ({ page }) => {
      await page.goto('/prospects');

      // Mobile top bar should be visible with menu button
      const menuButton = page.getByRole('button', { name: 'Open menu' });
      await expect(menuButton).toBeVisible();

      // Open mobile sidebar
      await menuButton.click();

      // Sidebar content should now be visible
      const mobileSidebar = page.locator('aside.fixed');
      await expect(mobileSidebar).toBeVisible();
      await expect(
        mobileSidebar.getByRole('link', { name: 'MockingBoard' }),
      ).toBeVisible();
      await expect(
        mobileSidebar.getByRole('link', { name: 'Home' }),
      ).toBeVisible();
    });

    test('clicking a nav link closes mobile sidebar', async ({ page }) => {
      await page.goto('/prospects');
      await page.getByRole('button', { name: 'Open menu' }).click();

      const mobileSidebar = page.locator('aside.fixed');
      await expect(mobileSidebar).toBeVisible();

      // Click a nav link — sidebar auto-closes on navigation
      await mobileSidebar.getByRole('link', { name: 'Teams' }).click();
      await expect(page).toHaveURL(/\/teams/);

      // Sidebar should be off-screen after navigation
      await expect(mobileSidebar).toHaveClass(/-translate-x-full/);
    });

    test('mobile top bar has search button', async ({ page }) => {
      await page.goto('/prospects');
      // The top bar search button has sr-only "Search" — use the exact filter
      // to distinguish from the sidebar search button (which has "Search ⌘K")
      await page
        .locator('button')
        .filter({ hasText: /^Search$/ })
        .click();
      await expect(
        page.getByPlaceholder('Search players, teams, users...'),
      ).toBeVisible();
    });
  });
});
