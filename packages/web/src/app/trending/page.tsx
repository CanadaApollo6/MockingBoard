import type { Metadata } from 'next';
import { getCachedSeasonConfig } from '@/lib/cache';
import { getTrendingProspects } from '@/lib/firebase/data';
import { TrendingProspectRow } from '@/components/player/trending-prospect-row';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Trending Prospects',
  description:
    'See which NFL Draft prospects the community is buzzing about — biggest risers, fallers, and most discussed players.',
};

export default async function TrendingPage() {
  const { draftYear } = await getCachedSeasonConfig();
  const trending = await getTrendingProspects(draftYear);

  const hasData =
    trending.mostDiscussed.length > 0 ||
    trending.risers.length > 0 ||
    trending.fallers.length > 0;

  return (
    <main className="mx-auto max-w-screen-xl px-4 py-8">
      <div className="mb-8">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold uppercase tracking-tight sm:text-4xl">
          Trending Prospects
        </h1>
        <p className="mt-2 text-muted-foreground">
          How the community ranks prospects compared to consensus — powered by{' '}
          {trending.totalBoards} public boards from {trending.totalScouts}{' '}
          scouts.
        </p>
      </div>

      {!hasData ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          Not enough public boards yet to generate trends. At least 3 boards
          must rank a player for them to appear here.
        </p>
      ) : (
        <div className="grid gap-10 lg:grid-cols-2 xl:grid-cols-3">
          {/* Most Discussed */}
          <section>
            <div className="mb-4">
              <h2 className="text-xl font-bold">Most Discussed</h2>
              <p className="text-sm text-muted-foreground">
                Players appearing on the most community boards
              </p>
            </div>
            <div className="space-y-2">
              {trending.mostDiscussed.map((t, i) => (
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

          {/* Biggest Risers */}
          {trending.risers.length > 0 && (
            <section>
              <div className="mb-4">
                <h2 className="text-xl font-bold">Biggest Risers</h2>
                <p className="text-sm text-muted-foreground">
                  Players the community ranks higher than consensus
                </p>
              </div>
              <div className="space-y-2">
                {trending.risers.map((t, i) => (
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

          {/* Biggest Fallers */}
          {trending.fallers.length > 0 && (
            <section>
              <div className="mb-4">
                <h2 className="text-xl font-bold">Biggest Fallers</h2>
                <p className="text-sm text-muted-foreground">
                  Players the community ranks lower than consensus
                </p>
              </div>
              <div className="space-y-2">
                {trending.fallers.map((t, i) => (
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
        </div>
      )}
    </main>
  );
}
