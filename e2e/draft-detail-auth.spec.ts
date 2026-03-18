import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';

/**
 * Navigate to the first draft in the authenticated user's draft list.
 * Returns false if no drafts exist.
 */
async function goToFirstUserDraft(page: Page): Promise<boolean> {
  await page.goto('/drafts');
  await expect(page.getByRole('heading', { name: 'My Drafts' })).toBeVisible();

  const draftLink = page.locator('a[href^="/drafts/"]').first();
  if ((await draftLink.count()) === 0) return false;

  await draftLink.click();
  await page.waitForURL(/\/drafts\/[^/]+$/);
  return true;
}

test.describe('draft detail page — authenticated', () => {
  test('draft detail page loads with heading', async ({
    authenticatedPage: page,
  }) => {
    if (!(await goToFirstUserDraft(page))) {
      test.skip();
      return;
    }
    await expect(page.locator('main h1')).toBeVisible();
  });

  test('lock prediction button appears if applicable', async ({
    authenticatedPage: page,
  }) => {
    if (!(await goToFirstUserDraft(page))) {
      test.skip();
      return;
    }
    const lockBtn = page.getByRole('button', { name: /Lock|Locked/ });
    if ((await lockBtn.count()) > 0) {
      await expect(lockBtn).toBeVisible();
    }
  });

  test('share button appears if applicable', async ({
    authenticatedPage: page,
  }) => {
    if (!(await goToFirstUserDraft(page))) {
      test.skip();
      return;
    }
    const shareBtn = page.getByRole('button', { name: /Share/ });
    if ((await shareBtn.count()) > 0) {
      await expect(shareBtn).toBeVisible();
    }
  });
});
