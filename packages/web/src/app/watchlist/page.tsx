import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Eye } from 'lucide-react';
import { Routes } from '@/routes';
import { getSessionUser } from '@/lib/firebase/auth-session';
import { getUserWatchlist, getPlayerMap } from '@/lib/firebase/data';
import { getCachedSeasonConfig } from '@/lib/cache';
import { ProspectCard } from '@/components/player/prospect-card';

export const metadata: Metadata = {
  title: 'Watchlist',
  description: 'Prospects you are tracking for the upcoming draft.',
};

export default async function WatchlistPage() {
  const session = await getSessionUser();
  if (!session) redirect(Routes.AUTH_SIGNIN);

  const { draftYear } = await getCachedSeasonConfig();
  const [watchlist, playerMap] = await Promise.all([
    getUserWatchlist(session.uid, draftYear),
    getPlayerMap(draftYear),
  ]);

  const players = watchlist
    .map((item) => playerMap.get(item.playerId))
    .filter((p) => !!p);

  return (
    <main className="mx-auto max-w-screen-xl px-4 py-8">
      <div className="flex items-center gap-3">
        <Eye className="h-6 w-6 text-mb-accent" />
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold uppercase tracking-tight">
          Watchlist
        </h1>
        <span className="text-sm text-muted-foreground">
          {players.length} prospect{players.length !== 1 && 's'}
        </span>
      </div>

      <p className="mt-2 text-sm text-muted-foreground">
        Track prospects throughout the draft cycle. Add any prospect from the{' '}
        <Link
          href={Routes.PROSPECTS}
          className="text-mb-accent hover:underline"
        >
          big board
        </Link>{' '}
        or their profile page.
      </p>

      {players.length === 0 ? (
        <div className="mt-16 text-center">
          <Eye className="mx-auto h-12 w-12 text-muted-foreground/30" />
          <p className="mt-4 text-lg font-medium text-muted-foreground">
            No prospects on your watchlist yet
          </p>
          <p className="mt-1 text-sm text-muted-foreground/70">
            Browse the{' '}
            <Link
              href={Routes.PROSPECTS}
              className="text-mb-accent hover:underline"
            >
              prospect board
            </Link>{' '}
            and tap the eye icon to start tracking players.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {players.map((player) => (
            <ProspectCard key={player.id} player={player} year={draftYear} />
          ))}
        </div>
      )}
    </main>
  );
}
