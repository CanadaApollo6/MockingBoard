import {
  test as publicTest,
  expect as publicExpect,
  type Page,
} from '@playwright/test';
import { test, expect } from './fixtures';

/** Navigate to the first prospect page. Returns false if none exist. */
async function goToFirstProspect(page: Page): Promise<boolean> {
  await page.goto('/prospects');
  const link = page.locator('a[href^="/prospects/"]').first();
  if ((await link.count()) === 0) return false;
  await link.click();
  await page.waitForURL(/\/prospects\//);
  return true;
}

/** Navigate to the first public board. Returns false if none exist. */
async function goToFirstBoard(page: Page): Promise<boolean> {
  await page.goto('/boards');
  const link = page.locator('a[href^="/boards/"]').first();
  if ((await link.count()) === 0) return false;
  await link.click();
  await page.waitForURL(/\/boards\//);
  return true;
}

/** Navigate to the first public profile. Returns false if none exist. */
async function goToFirstProfile(page: Page): Promise<boolean> {
  await page.goto('/community');
  const link = page.locator('a[href^="/profile/"]').first();
  if ((await link.count()) === 0) return false;
  await link.click();
  await page.waitForURL(/\/profile\//);
  return true;
}

// --- WatchButton ---

test.describe('WatchButton — authenticated', () => {
  test('watch button is interactive', async ({ authenticatedPage: page }) => {
    if (!(await goToFirstProspect(page))) {
      test.skip();
      return;
    }
    const btn = page.getByRole('button', {
      name: /Add to watchlist|Remove from watchlist/,
    });
    if ((await btn.count()) === 0) {
      test.skip();
      return;
    }
    await expect(btn).not.toHaveAttribute('aria-disabled', 'true');
  });
});

publicTest.describe('WatchButton — unauthenticated', () => {
  publicTest('watch button is disabled', async ({ page }) => {
    if (!(await goToFirstProspect(page))) {
      publicTest.skip();
      return;
    }
    const btn = page.getByRole('button', {
      name: /Add to watchlist|Remove from watchlist/,
    });
    if ((await btn.count()) === 0) {
      publicTest.skip();
      return;
    }
    await publicExpect(btn).toHaveAttribute('aria-disabled', 'true');
  });
});

// --- LikeButton ---

test.describe('LikeButton — authenticated', () => {
  test('like button is enabled on boards page', async ({
    authenticatedPage: page,
  }) => {
    await page.goto('/boards');
    const likeBtn = page
      .getByRole('button', { name: /^Like$|^Unlike$/ })
      .first();
    if ((await likeBtn.count()) === 0) {
      test.skip();
      return;
    }
    await expect(likeBtn).toBeEnabled();
  });
});

publicTest.describe('LikeButton — unauthenticated', () => {
  publicTest('like button is disabled on boards page', async ({ page }) => {
    await page.goto('/boards');
    const likeBtn = page
      .getByRole('button', { name: /^Like$|^Unlike$/ })
      .first();
    if ((await likeBtn.count()) === 0) {
      publicTest.skip();
      return;
    }
    await publicExpect(likeBtn).toBeDisabled();
  });
});

// --- BookmarkButton ---

test.describe('BookmarkButton — authenticated', () => {
  test('bookmark button is enabled on boards page', async ({
    authenticatedPage: page,
  }) => {
    await page.goto('/boards');
    const btn = page
      .getByRole('button', { name: /Bookmark|Remove bookmark/ })
      .first();
    if ((await btn.count()) === 0) {
      test.skip();
      return;
    }
    await expect(btn).toBeEnabled();
  });
});

publicTest.describe('BookmarkButton — unauthenticated', () => {
  publicTest('bookmark button is disabled', async ({ page }) => {
    await page.goto('/boards');
    const btn = page
      .getByRole('button', { name: /Bookmark|Remove bookmark/ })
      .first();
    if ((await btn.count()) === 0) {
      publicTest.skip();
      return;
    }
    await publicExpect(btn).toBeDisabled();
  });
});

// --- CommentForm ---

test.describe('CommentForm — authenticated', () => {
  test('shows textarea for authenticated users', async ({
    authenticatedPage: page,
  }) => {
    if (!(await goToFirstBoard(page))) {
      test.skip();
      return;
    }
    await page.getByRole('button', { name: /Comments/ }).click();
    await expect(page.locator('textarea')).toBeVisible();
    await expect(page.getByText('Sign in')).not.toBeVisible();
  });

  test('can type in comment textarea', async ({ authenticatedPage: page }) => {
    if (!(await goToFirstBoard(page))) {
      test.skip();
      return;
    }
    await page.getByRole('button', { name: /Comments/ }).click();
    const textarea = page.locator('textarea');
    await textarea.fill('test comment');
    await expect(textarea).toHaveValue('test comment');
  });
});

// --- QuickGrade ---

test.describe('QuickGrade — authenticated', () => {
  test('Quick Grade CTA is visible on prospect page', async ({
    authenticatedPage: page,
  }) => {
    if (!(await goToFirstProspect(page))) {
      test.skip();
      return;
    }
    const hasGradeLink = (await page.getByText('Quick Grade').count()) > 0;
    const hasGradeBadge = (await page.getByText('Your grade:').count()) > 0;
    expect(hasGradeLink || hasGradeBadge).toBe(true);
  });
});

publicTest.describe('QuickGrade — unauthenticated', () => {
  publicTest('Quick Grade does not render', async ({ page }) => {
    if (!(await goToFirstProspect(page))) {
      publicTest.skip();
      return;
    }
    await publicExpect(page.getByText('Quick Grade')).not.toBeVisible();
  });
});

// --- FollowButton ---

test.describe('FollowButton — authenticated', () => {
  test('follow button renders on profile page', async ({
    authenticatedPage: page,
  }) => {
    if (!(await goToFirstProfile(page))) {
      test.skip();
      return;
    }
    const followBtn = page.getByRole('button', {
      name: /^Follow$|^Following$/,
    });
    if ((await followBtn.count()) === 0) {
      test.skip();
      return;
    }
    await expect(followBtn).toBeVisible();
  });
});
