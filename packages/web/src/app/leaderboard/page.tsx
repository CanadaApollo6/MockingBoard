import { getLeaderboard, getYearLeaderboard } from '@/lib/data';
import type { LeaderboardEntry } from '@/lib/data';
import { getCachedSeasonConfig } from '@/lib/cache';
import { LeaderboardPageClient } from './leaderboard-page-client';

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { year: yearParam } = await searchParams;
  const { draftYear } = await getCachedSeasonConfig();

  const selectedYear =
    yearParam && !Array.isArray(yearParam) ? parseInt(yearParam) : null;

  let entries: LeaderboardEntry[];

  if (selectedYear && selectedYear > 2000 && selectedYear <= draftYear) {
    entries = await getYearLeaderboard(selectedYear).catch(() => []);
  } else {
    // All-time: convert User[] to LeaderboardEntry[]
    const users = await getLeaderboard(100).catch(() => []);
    entries = users.map((u) => ({
      userId: u.id,
      displayName: u.displayName,
      slug: u.slug,
      isPublic: u.isPublic,
      avgScore: u.stats?.accuracyScore ?? 0,
      draftCount: 0,
    }));
  }

  // Available years for the dropdown (last 5 years up to current)
  const availableYears: number[] = [];
  for (let y = draftYear; y >= draftYear - 4 && y >= 2024; y--) {
    availableYears.push(y);
  }

  return (
    <main className="mx-auto max-w-screen-xl px-4 py-8">
      <LeaderboardPageClient
        entries={entries}
        selectedYear={selectedYear}
        availableYears={availableYears}
      />
    </main>
  );
}
