import Link from 'next/link';
import { getSessionUser } from '@/lib/auth-session';
import { getPlayerMap, getUserBoardForYear } from '@/lib/data';
import { getCachedSeasonConfig } from '@/lib/cache';
import { BoardEditor } from './board-editor';

export default async function BoardPage() {
  const session = await getSessionUser();

  if (!session) {
    return (
      <main className="mx-auto max-w-screen-xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold">Big Board</h1>
        <p className="py-12 text-center text-muted-foreground">
          <Link href="/login" className="text-primary hover:underline">
            Sign in
          </Link>{' '}
          to create your Big Board.
        </p>
      </main>
    );
  }

  const { draftYear } = await getCachedSeasonConfig();
  const [playerMap, board] = await Promise.all([
    getPlayerMap(draftYear),
    getUserBoardForYear(session.uid, draftYear),
  ]);

  const players = Object.fromEntries(playerMap);

  return (
    <main className="mx-auto max-w-screen-xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Big Board</h1>
      <BoardEditor players={players} initialBoard={board} year={draftYear} />
    </main>
  );
}
