import { test, expect } from '@playwright/test';

const routes = [
  { path: '/prospects', heading: '2026 Big Board' },
  { path: '/teams', heading: 'NFL Teams' },
  { path: '/draft-order', heading: '2026 Draft Order' },
  { path: '/trade-calculator', heading: 'Trade Calculator' },
  { path: '/leaderboard', heading: 'Leaderboard' },
  { path: '/community', heading: 'Community' },
  { path: '/boards', heading: 'Community Boards' },
  { path: '/discover', heading: 'Discover' },
  { path: '/lists', heading: 'Community Lists' },
];

for (const { path, heading } of routes) {
  test(`${path} renders with heading "${heading}"`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole('heading', { name: heading })).toBeVisible();
  });
}
