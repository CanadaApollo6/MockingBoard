import { test, expect, type Page } from '@playwright/test';

/** Navigate from /boards to the first public board. Returns false if none exist. */
async function goToFirstBoard(page: Page): Promise<boolean> {
  await page.goto('/boards');
  await expect(
    page.getByRole('heading', { name: 'Community Boards' }),
  ).toBeVisible();

  const boardLink = page.locator('a[href^="/boards/"]').first();
  if ((await boardLink.count()) === 0) return false;

  await boardLink.click();
  await expect(page).toHaveURL(/\/boards\//);
  return true;
}

test.describe('comments on boards', () => {
  test('board page has a comment section', async ({ page }) => {
    if (!(await goToFirstBoard(page))) {
      test.skip();
      return;
    }

    // The comments toggle button should be visible
    await expect(page.getByRole('button', { name: /Comments/ })).toBeVisible();
  });

  test('clicking comments button shows comment form or sign-in prompt', async ({
    page,
  }) => {
    if (!(await goToFirstBoard(page))) {
      test.skip();
      return;
    }

    await page.getByRole('button', { name: /Comments/ }).click();

    // Either the comment form (textarea) or a sign-in prompt should appear
    const hasTextarea = (await page.locator('textarea').count()) > 0;
    const hasSignIn = (await page.getByText('Sign in').count()) > 0;
    expect(hasTextarea || hasSignIn).toBe(true);
  });

  test('unauthenticated users see sign-in prompt', async ({ page }) => {
    if (!(await goToFirstBoard(page))) {
      test.skip();
      return;
    }

    await page.getByRole('button', { name: /Comments/ }).click();

    await expect(page.getByText('Sign in')).toBeVisible();
  });
});
