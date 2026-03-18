import { test, expect } from '@playwright/test';

test.describe('navigation', () => {
  test.describe('desktop sidebar', () => {
    test('sidebar is visible on desktop viewport', async ({ page }) => {
      await page.goto('/prospects');

      // Sidebar should show the MockingBoard logo/link
      await expect(
        page.locator('aside').getByRole('link', { name: 'MockingBoard' }),
      ).toBeVisible();

      // Home is always visible (not in a collapsible group)
      await expect(
        page.locator('aside').getByRole('link', { name: 'Home' }),
      ).toBeVisible();

      // Prospects is in Scouting group which is active on /prospects
      await expect(
        page.locator('aside').getByRole('link', { name: 'Prospects' }),
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

  test.describe('collapsible groups', () => {
    test('active group is open and others are collapsed on load', async ({
      page,
    }) => {
      await page.goto('/prospects');
      const sidebar = page.locator('aside').first();

      // Scouting group items should be visible (active group)
      await expect(
        sidebar.getByRole('link', { name: 'Prospects' }),
      ).toBeVisible();
      await expect(
        sidebar.getByRole('link', { name: 'My Board' }),
      ).toBeVisible();

      // Tools group items should be hidden (collapsed)
      await expect(
        sidebar.getByRole('link', { name: 'Trade Calculator' }),
      ).toBeHidden();
    });

    test('clicking a group header expands it', async ({ page }) => {
      await page.goto('/prospects');
      const sidebar = page.locator('aside').first();

      // Tools items hidden initially
      await expect(
        sidebar.getByRole('link', { name: 'Trade Calculator' }),
      ).toBeHidden();

      // Click the Tools group header
      await sidebar.getByRole('button', { name: 'Tools' }).click();

      // Tools items now visible
      await expect(
        sidebar.getByRole('link', { name: 'Trade Calculator' }),
      ).toBeVisible();
    });

    test('navigating to a new section auto-collapses previous group', async ({
      page,
    }) => {
      await page.goto('/prospects');
      const sidebar = page.locator('aside').first();

      // Scouting is open
      await expect(
        sidebar.getByRole('link', { name: 'My Board' }),
      ).toBeVisible();

      // Navigate to a Tools page
      await sidebar.getByRole('button', { name: 'Tools' }).click();
      await sidebar.getByRole('link', { name: 'Teams' }).click();
      await expect(page).toHaveURL(/\/teams/);

      // Tools is now open, Scouting is collapsed
      await expect(
        sidebar.getByRole('link', { name: 'Trade Calculator' }),
      ).toBeVisible();
      await expect(
        sidebar.getByRole('link', { name: 'My Board' }),
      ).toBeHidden();
    });
  });

  test.describe('mobile navigation', () => {
    test.use({ viewport: { width: 375, height: 812 } });

    test('hamburger menu opens mobile sidebar', async ({ page }) => {
      await page.goto('/prospects');

      const menuButton = page.getByRole('button', { name: 'Open menu' });
      await expect(menuButton).toBeVisible();

      await menuButton.click();

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

      // Expand Tools group, then click Teams
      await mobileSidebar.getByRole('button', { name: 'Tools' }).click();
      await mobileSidebar.getByRole('link', { name: 'Teams' }).click();
      await expect(page).toHaveURL(/\/teams/);

      // Sidebar should be off-screen after navigation
      await expect(mobileSidebar).toHaveClass(/-translate-x-full/);
    });

    test('mobile top bar has search button', async ({ page }) => {
      await page.goto('/prospects');
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
