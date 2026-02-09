import Link from 'next/link';
import { getSessionUser } from '@/lib/auth-session';
import { getPlayerMap, getUserBoardForYear } from '@/lib/data';
import { getCachedSeasonConfig } from '@/lib/cache';
import { RankingsClient } from './rankings-client';

export default async function RankingsPage() {
  const session = await getSessionUser();

  if (!session) {
    return (
      <main className="mx-auto max-w-screen-xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold">Positional Rankings</h1>
        <p className="py-12 text-center text-muted-foreground">
          <Link href="/auth" className="text-primary hover:underline">
            Sign in
          </Link>{' '}
          to create positional rankings.
        </p>
      </main>
    );
  }

  const { draftYear } = await getCachedSeasonConfig();
  const [playerMap, board] = await Promise.all([
    getPlayerMap(draftYear),
    getUserBoardForYear(session.uid, draftYear),
  ]);

  if (!board) {
    return (
      <main className="mx-auto max-w-screen-xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold">Positional Rankings</h1>
        <p className="py-12 text-center text-muted-foreground">
          Create a{' '}
          <Link href="/board" className="text-primary hover:underline">
            Big Board
          </Link>{' '}
          first — positional rankings are derived from your board.
        </p>
      </main>
    );
  }

  const players = Object.fromEntries(playerMap);

  return (
    <main className="mx-auto max-w-screen-xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Positional Rankings</h1>
      <RankingsClient board={board} players={players} />
    </main>
  );
}
