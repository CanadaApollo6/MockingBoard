import { test, expect } from '@playwright/test';

const PERF_ROUTES = [
  { path: '/', name: 'landing page' },
  { path: '/prospects', name: 'prospects' },
  { path: '/teams', name: 'teams' },
  { path: '/trade-calculator', name: 'trade calculator' },
  { path: '/drafts/new', name: 'draft creator' },
  { path: '/contract-builder', name: 'contract builder' },
  { path: '/learn/salary-cap', name: 'salary cap explainer' },
  { path: '/learn/nfl-draft', name: 'nfl draft explainer' },
  { path: '/comparePlayers', name: 'player compare (empty)' },
  {
    path: '/comparePlayers?p1=3139477&p2=3918298',
    name: 'player compare (full)',
  },
];

for (const { path, name } of PERF_ROUTES) {
  test(`${name} loads within 5 seconds`, async ({ page }) => {
    const start = Date.now();
    await page.goto(path, { waitUntil: 'networkidle' });
    const loadTime = Date.now() - start;

    expect(loadTime).toBeLessThan(5000);
  });
}

test('guest draft room loads within 8 seconds', async ({ page }) => {
  const start = Date.now();
  await page.goto(
    '/drafts/guest?year=2026&rounds=1&format=single-team&team=KC&cpuSpeed=instant',
    { waitUntil: 'networkidle' },
  );
  const loadTime = Date.now() - start;

  // Guest draft does server-side data fetching, allow more time
  expect(loadTime).toBeLessThan(8000);
});
