import { test, expect } from './fixtures';

test.describe('settings page', () => {
  test('renders Settings heading', async ({ authenticatedPage: page }) => {
    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  });

  test('Account Info card is visible', async ({ authenticatedPage: page }) => {
    await page.goto('/settings');
    // Wait for client component to hydrate (SettingsClient returns null until profile loads)
    await expect(page.getByText('Account Info')).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText('Display Name')).toBeVisible();
  });

  test('Account Linking card is visible', async ({
    authenticatedPage: page,
  }) => {
    await page.goto('/settings');
    await expect(page.getByText('Account Linking')).toBeVisible({
      timeout: 15_000,
    });
  });

  test('Color Theme card renders with team grid', async ({
    authenticatedPage: page,
  }) => {
    await page.goto('/settings');
    await expect(page.getByText('Color Theme')).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText('AFC').first()).toBeVisible();
    await expect(page.getByText('NFC').first()).toBeVisible();
  });

  test('Discord Webhook card is visible', async ({
    authenticatedPage: page,
  }) => {
    await page.goto('/settings');
    await expect(
      page.getByText('Discord Webhook', { exact: true }),
    ).toBeVisible({ timeout: 15_000 });
  });

  test('profile card links to /settings/profile', async ({
    authenticatedPage: page,
  }) => {
    await page.goto('/settings');
    // Wait for client component before clicking — scope to main to avoid sidebar
    await expect(page.locator('main a[href="/settings/profile"]')).toBeVisible({
      timeout: 15_000,
    });
    await page.locator('main a[href="/settings/profile"]').click();
    await expect(page).toHaveURL(/\/settings\/profile/);
  });
});

test.describe('settings/profile page', () => {
  test('renders Edit Profile heading', async ({ authenticatedPage: page }) => {
    await page.goto('/settings/profile');
    // Edit Profile heading is inside ProfilePageClient (client component)
    await expect(
      page.getByRole('heading', { name: 'Edit Profile' }),
    ).toBeVisible({ timeout: 15_000 });
  });

  test('Profile Visibility toggle is rendered', async ({
    authenticatedPage: page,
  }) => {
    await page.goto('/settings/profile');
    await expect(page.getByText('Profile Visibility')).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole('button', { name: 'Private' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Public' })).toBeVisible();
  });

  test('My Team section shows team grid', async ({
    authenticatedPage: page,
  }) => {
    await page.goto('/settings/profile');
    await expect(page.getByText('My Team')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('AFC').first()).toBeVisible();
  });

  test('Save Profile button is rendered', async ({
    authenticatedPage: page,
  }) => {
    await page.goto('/settings/profile');
    await expect(
      page.getByRole('button', { name: 'Save Profile' }),
    ).toBeVisible({ timeout: 15_000 });
  });

  test('back link returns to /settings', async ({
    authenticatedPage: page,
  }) => {
    await page.goto('/settings/profile');
    // Scope to main to avoid matching sidebar link
    await expect(page.locator('main a[href="/settings"]')).toBeVisible({
      timeout: 15_000,
    });
    await page.locator('main a[href="/settings"]').click();
    await expect(page).toHaveURL(/\/settings$/);
  });
});
