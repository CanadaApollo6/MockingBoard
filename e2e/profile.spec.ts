import { test, expect, type Page } from '@playwright/test';

/** Navigate from community page to the first public profile. Returns false if none exist. */
async function goToFirstProfile(page: Page): Promise<boolean> {
  await page.goto('/community');
  await expect(page.getByRole('heading', { name: 'Community' })).toBeVisible();

  const profileLink = page.locator('a[href^="/profile/"]').first();
  if ((await profileLink.count()) === 0) return false;

  await profileLink.click();
  await expect(page).toHaveURL(/\/profile\//);
  return true;
}

test.describe('scout profile page', () => {
  test('community page lists analysts or shows empty state', async ({
    page,
  }) => {
    await page.goto('/community');
    await expect(page.getByRole('heading', { name: 'Analysts' })).toBeVisible();

    // Either profiles exist or the empty state is shown
    const hasProfiles =
      (await page.locator('a[href^="/profile/"]').count()) > 0;
    const hasEmptyState =
      (await page.getByText('No public profiles yet').count()) > 0;
    expect(hasProfiles || hasEmptyState).toBe(true);
  });

  test('profile header shows name, follow stats, and content sections', async ({
    page,
  }) => {
    if (!(await goToFirstProfile(page))) {
      test.skip();
      return;
    }

    // Profile header
    await expect(page.locator('main h1')).toBeVisible();
    await expect(page.getByText('followers')).toBeVisible();
    await expect(page.getByText('following')).toBeVisible();

    // Content sections always render (even if empty state text)
    await expect(
      page.getByRole('heading', { name: 'Big Boards' }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Scouting Reports' }),
    ).toBeVisible();
  });

  test('Recent Activity section contains clickable timeline items', async ({
    page,
  }) => {
    if (!(await goToFirstProfile(page))) {
      test.skip();
      return;
    }

    const activityHeading = page.getByRole('heading', {
      name: 'Recent Activity',
    });

    // Activity section is conditional — only shown if the profile has activity
    if ((await activityHeading.count()) === 0) return;

    await expect(activityHeading).toBeVisible();

    // Timeline items are links within the activity container
    const activityContainer = page
      .locator('div')
      .filter({ has: activityHeading });
    const firstItem = activityContainer.locator('a').first();
    await expect(firstItem).toBeVisible();
    await expect(firstItem).toHaveAttribute('href', /^\//);
  });

  test('Liked content sections render when present', async ({ page }) => {
    if (!(await goToFirstProfile(page))) {
      test.skip();
      return;
    }

    // Liked sections are conditional — verify they render correctly if present
    const likedBoards = page.getByRole('heading', { name: 'Liked Boards' });
    const likedReports = page.getByRole('heading', { name: 'Liked Reports' });

    if ((await likedBoards.count()) > 0) {
      await expect(likedBoards).toBeVisible();
    }
    if ((await likedReports.count()) > 0) {
      await expect(likedReports).toBeVisible();
    }
  });

  test('profile returns 404 for non-existent slug', async ({ page }) => {
    const response = await page.goto(
      '/profile/this-slug-definitely-does-not-exist-xyz-123',
    );
    expect(response?.status()).toBe(404);
  });
});
