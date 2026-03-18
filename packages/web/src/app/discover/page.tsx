import type { Metadata } from 'next';
import {
  getTrendingBoards,
  getPopularReports,
  getPublicBoards,
  getLeaderboard,
  getPopularLists,
  getTrendingProspects,
  getPlayerMap,
} from '@/lib/firebase/data';
import { getCachedSeasonConfig } from '@/lib/cache';
import { Routes } from '@/routes';
import { BoardCard } from '@/components/board/board-card';
import { ReportCard } from '@/components/community/report-card';
import { ListCard } from '@/components/list/list-card';
import { TrendingProspectRow } from '@/components/player/trending-prospect-row';
import { AnalystProfileCard } from '@/components/profile/analyst-profile-card';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Discover',
  description:
    'Explore trending boards, popular scouting reports, and top scouts in the MockingBoard community.',
};

export default async function DiscoverPage() {
  // Trending/popular queries need Firestore indexes — gracefully degrade if missing
  const { draftYear } = await getCachedSeasonConfig();

  const [
    trendingBoards,
    popularReports,
    { boards: justPublished },
    allScouts,
    popularLists,
    trending,
  ] = await Promise.all([
    getTrendingBoards(8).catch(() => []),
    getPopularReports(6).catch(() => []),
    getPublicBoards({ limit: 6 }),
    getLeaderboard(6),
    getPopularLists(4).catch(() => []),
    getTrendingProspects(draftYear).catch(() => ({
      mostDiscussed: [],
      risers: [],
      fallers: [],
      totalBoards: 0,
      totalScouts: 0,
    })),
  ]);

  // Filter to public scouts only
  const topScouts = allScouts.filter((u) => u.isPublic);

  // Resolve player names for popular reports
  const playerIds = [...new Set(popularReports.map((r) => r.playerId))];
  const playerMap = new Map<string, { name: string }>();
  if (playerIds.length > 0) {
    const fullMap = await getPlayerMap(2026);
    for (const id of playerIds) {
      const p = fullMap.get(id);
      if (p) playerMap.set(id, { name: p.name });
    }
  }

  return (
    <main className="mx-auto max-w-screen-xl px-4 py-8">
      <div className="mb-8">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold uppercase tracking-tight sm:text-4xl">
          Discover
        </h1>
        <p className="mt-2 text-muted-foreground">
          Explore trending boards, popular reports, and top scouts from the
          community.
        </p>
      </div>

      {/* Trending Boards */}
      <section className="mb-12">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Trending Boards</h2>
            <p className="text-sm text-muted-foreground">
              Most liked boards from the community
            </p>
          </div>
          <a
            href={Routes.BOARDS}
            className="text-sm text-mb-accent hover:underline"
          >
            View all
          </a>
        </div>
        {trendingBoards.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No trending boards yet.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {trendingBoards.map((board) => (
              <BoardCard key={board.id} board={board} />
            ))}
          </div>
        )}
      </section>

      {/* Popular Reports */}
      <section className="mb-12">
        <div className="mb-4">
          <h2 className="text-xl font-bold">Popular Reports</h2>
          <p className="text-sm text-muted-foreground">
            Highly rated scouting reports
          </p>
        </div>
        {popularReports.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No scouting reports yet.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {popularReports.map((report) => {
              const playerName = playerMap.get(report.playerId)?.name;
              return (
                <div key={report.id}>
                  {playerName && (
                    <p className="mb-1 text-xs font-medium text-muted-foreground">
                      on{' '}
                      <a
                        href={`/prospects/${report.playerId}`}
                        className="text-mb-accent hover:underline"
                      >
                        {playerName}
                      </a>
                    </p>
                  )}
                  <ReportCard report={report} />
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Trending Prospects */}
      {trending.mostDiscussed.length > 0 && (
        <section className="mb-12">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Trending Prospects</h2>
              <p className="text-sm text-muted-foreground">
                Most discussed players across community boards
              </p>
            </div>
            <a
              href={Routes.TRENDING}
              className="text-sm text-mb-accent hover:underline"
            >
              View all
            </a>
          </div>
          <div className="space-y-2">
            {trending.mostDiscussed.slice(0, 4).map((t, i) => (
              <TrendingProspectRow
                key={t.player.id}
                player={t.player}
                boardCount={t.boardCount}
                averageRank={t.averageRank}
                delta={t.delta}
                rank={i + 1}
              />
            ))}
          </div>
        </section>
      )}

      {/* Top Scouts */}
      <section className="mb-12">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Top Scouts</h2>
            <p className="text-sm text-muted-foreground">
              Scouts with the best prediction accuracy
            </p>
          </div>
          <a
            href={Routes.LEADERBOARD}
            className="text-sm text-mb-accent hover:underline"
          >
            View all
          </a>
        </div>
        {topScouts.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No public scouts yet.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {topScouts.map((user) => (
              <AnalystProfileCard key={user.id} user={user} />
            ))}
          </div>
        )}
      </section>

      {/* Popular Lists */}
      {popularLists.length > 0 && (
        <section className="mb-12">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Popular Lists</h2>
              <p className="text-sm text-muted-foreground">
                Curated collections from the community
              </p>
            </div>
            <a
              href={Routes.LISTS}
              className="text-sm text-mb-accent hover:underline"
            >
              View all
            </a>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {popularLists.map((list) => (
              <ListCard key={list.id} list={list} />
            ))}
          </div>
        </section>
      )}

      {/* Just Published */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Just Published</h2>
            <p className="text-sm text-muted-foreground">
              Newest boards from the community
            </p>
          </div>
          <a
            href={Routes.BOARDS}
            className="text-sm text-mb-accent hover:underline"
          >
            View all
          </a>
        </div>
        {justPublished.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No community boards yet.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {justPublished.map((board) => (
              <BoardCard key={board.id} board={board} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
