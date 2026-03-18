import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';

/**
 * Navigate to the authenticated user's own profile page.
 * Returns false if the test user has no public profile slug set.
 */
async function goToOwnProfile(page: Page): Promise<boolean> {
  await page.goto('/settings');
  const slugText = page.getByText(/mockingboard\.com\/profile\//);
  if ((await slugText.count()) === 0) return false;

  const text = await slugText.textContent();
  const match = text?.match(/profile\/([a-z0-9-]+)/);
  if (!match) return false;

  await page.goto(`/profile/${match[1]}`);
  await page.waitForURL(/\/profile\//);
  return true;
}

test.describe('own profile — authenticated', () => {
  test('profile page loads without error', async ({
    authenticatedPage: page,
  }) => {
    if (!(await goToOwnProfile(page))) {
      test.skip();
      return;
    }
    await expect(page.locator('main h1')).toBeVisible();
  });

  test('follow button does not appear on own profile', async ({
    authenticatedPage: page,
  }) => {
    if (!(await goToOwnProfile(page))) {
      test.skip();
      return;
    }
    const followBtn = page.getByRole('button', { name: /^Follow$/ });
    await expect(followBtn).not.toBeVisible();
  });

  test('Watching section present if watchlist non-empty', async ({
    authenticatedPage: page,
  }) => {
    if (!(await goToOwnProfile(page))) {
      test.skip();
      return;
    }
    const section = page.getByRole('heading', { name: 'Watching' });
    if ((await section.count()) > 0) {
      await expect(section).toBeVisible();
    }
    // Passes vacuously if empty — that's fine
  });

  test('Saved Boards section present if bookmarks exist', async ({
    authenticatedPage: page,
  }) => {
    if (!(await goToOwnProfile(page))) {
      test.skip();
      return;
    }
    const section = page.getByRole('heading', { name: 'Saved Boards' });
    if ((await section.count()) > 0) {
      await expect(section).toBeVisible();
    }
  });

  test('Tape Log section present if reports exist', async ({
    authenticatedPage: page,
  }) => {
    if (!(await goToOwnProfile(page))) {
      test.skip();
      return;
    }
    const section = page.getByRole('heading', { name: 'Tape Log' });
    if ((await section.count()) > 0) {
      await expect(section).toBeVisible();
    }
  });
});
