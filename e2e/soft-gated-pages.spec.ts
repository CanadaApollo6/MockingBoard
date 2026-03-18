import { test as publicTest, expect as publicExpect } from '@playwright/test';
import { test, expect } from './fixtures';

publicTest.describe('soft-gated pages — unauthenticated', () => {
  publicTest('/drafts shows sign-in prompt', async ({ page }) => {
    await page.goto('/drafts');
    await publicExpect(
      page.getByRole('heading', { name: 'Drafts' }),
    ).toBeVisible();
    await publicExpect(page.getByText('to view your drafts')).toBeVisible();
  });

  publicTest('/board shows sign-in prompt', async ({ page }) => {
    await page.goto('/board');
    await publicExpect(
      page.getByRole('heading', { name: 'Big Board' }),
    ).toBeVisible();
    await publicExpect(
      page.getByText('to create your Big Board'),
    ).toBeVisible();
  });

  publicTest('/rankings shows sign-in prompt', async ({ page }) => {
    await page.goto('/rankings');
    await publicExpect(
      page.getByRole('heading', { name: 'Positional Rankings' }),
    ).toBeVisible();
    await publicExpect(
      page.getByText('to create positional rankings'),
    ).toBeVisible();
  });
});

test.describe('soft-gated pages — authenticated', () => {
  test('/drafts renders My Drafts page', async ({
    authenticatedPage: page,
  }) => {
    await page.goto('/drafts');
    // Server component with data fetching — may take a moment
    await expect(page.getByRole('heading', { name: 'My Drafts' })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText('to view your drafts')).not.toBeVisible();
    // Scope to main to avoid matching sidebar links
    await expect(page.locator('main a[href="/drafts/new"]')).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Join a Draft' }),
    ).toBeVisible();
  });

  test('/board renders board editor', async ({ authenticatedPage: page }) => {
    await page.goto('/board');
    await expect(
      page.getByRole('heading', { name: 'Big Board' }),
    ).toBeVisible();
    await expect(page.getByText('to create your Big Board')).not.toBeVisible();
  });

  test('/rankings renders without sign-in prompt', async ({
    authenticatedPage: page,
  }) => {
    await page.goto('/rankings');
    await expect(
      page.getByRole('heading', { name: 'Positional Rankings' }),
    ).toBeVisible();
    await expect(
      page.getByText('to create positional rankings'),
    ).not.toBeVisible();
    // Either rankings editor or "Create a Big Board first" prompt
    const hasContent = (await page.locator('main').textContent())?.includes(
      'Positional Rankings',
    );
    expect(hasContent).toBe(true);
  });
});
