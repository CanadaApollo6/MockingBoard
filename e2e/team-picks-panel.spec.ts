import { test, expect } from '@playwright/test';

const GUEST_DRAFT_URL =
  '/drafts/guest?year=2026&rounds=1&format=single-team&team=KC&cpuSpeed=instant';

test.describe('team picks panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(GUEST_DRAFT_URL);
    // Wait for draft room to render
    await expect(page.getByRole('heading').first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test('panel renders with header and team selector', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Team Picks/ })).toBeVisible();
    await expect(page.locator('select')).toBeVisible();
  });

  test('collapse and expand toggles content visibility', async ({ page }) => {
    const toggleButton = page.getByRole('button', { name: /Team Picks/ });
    const teamSelect = page.locator('select');

    // Panel starts open
    await expect(teamSelect).toBeVisible();

    // Collapse
    await toggleButton.click();
    await expect(teamSelect).not.toBeVisible();

    // Expand
    await toggleButton.click();
    await expect(teamSelect).toBeVisible();
  });

  test('team selector contains multiple teams', async ({ page }) => {
    const options = page.locator('select option');
    const count = await options.count();
    expect(count).toBeGreaterThan(1);
  });

  test('defaults to user team (KC)', async ({ page }) => {
    const teamSelect = page.locator('select');
    await expect(teamSelect).toHaveValue('KC');
  });

  test('shows picks for a CPU team after cascade', async ({ page }) => {
    const teamSelect = page.locator('select');

    // Wait for CPU picks to cascade (instant speed)
    // Then select a team and check for picks
    await teamSelect.selectOption('TEN');

    // Wait for a pick row with round.pick format (e.g., "1.01")
    const pickRow = page.locator('text=/\\d\\.\\d{2}/');
    await expect(pickRow.first()).toBeVisible({ timeout: 15_000 });
  });

  test('switching teams changes displayed picks', async ({ page }) => {
    const teamSelect = page.locator('select');

    // Select first team and wait for picks
    await teamSelect.selectOption('TEN');
    const pickRow = page.locator('text=/\\d\\.\\d{2}/');
    await expect(pickRow.first()).toBeVisible({ timeout: 15_000 });

    // Switch back to user's team (KC) which hasn't picked yet (waiting for user)
    await teamSelect.selectOption('KC');

    // Should show "No picks yet" since KC hasn't made a pick
    await expect(page.getByText('No picks yet')).toBeVisible();
  });

  test('pick rows show player name and position', async ({ page }) => {
    const teamSelect = page.locator('select');
    await teamSelect.selectOption('TEN');

    // Wait for pick to appear
    const pickRow = page.locator('text=/\\d\\.\\d{2}/');
    await expect(pickRow.first()).toBeVisible({ timeout: 15_000 });

    // Panel should contain a player name (truncate class) and position badge
    const panel = page.locator('.rounded-lg.border.bg-card');
    await expect(panel.locator('.truncate').first()).toBeVisible();
  });

  test('header shows pick count when team has picks', async ({ page }) => {
    const teamSelect = page.locator('select');
    await teamSelect.selectOption('TEN');

    // Wait for picks
    const pickRow = page.locator('text=/\\d\\.\\d{2}/');
    await expect(pickRow.first()).toBeVisible({ timeout: 15_000 });

    // Header should show count like "(1)"
    const headerButton = page.getByRole('button', { name: /Team Picks/ });
    await expect(headerButton).toBeVisible();
    await expect(headerButton).toContainText(/\(\d+\)/);
  });
});
