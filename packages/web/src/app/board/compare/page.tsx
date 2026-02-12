import Link from 'next/link';
import {
  getBigBoard,
  getBoardSnapshot,
  getPlayerMap,
} from '@/lib/firebase/data';
import { BoardCompareView } from './board-compare-view';

interface ComparePageProps {
  searchParams: Promise<{ boardId?: string; snapshotId?: string }>;
}

export default async function ComparePage({ searchParams }: ComparePageProps) {
  const { boardId, snapshotId } = await searchParams;

  if (!boardId || !snapshotId) {
    return (
      <main className="mx-auto max-w-screen-xl px-4 py-8">
        <p className="text-muted-foreground">
          Missing boardId or snapshotId.{' '}
          <Link href="/board" className="text-primary hover:underline">
            Back to Board
          </Link>
        </p>
      </main>
    );
  }

  const [board, snapshot] = await Promise.all([
    getBigBoard(boardId),
    getBoardSnapshot(boardId, snapshotId),
  ]);

  if (!board || !snapshot) {
    return (
      <main className="mx-auto max-w-screen-xl px-4 py-8">
        <p className="text-muted-foreground">
          Board or snapshot not found.{' '}
          <Link href="/board" className="text-primary hover:underline">
            Back to Board
          </Link>
        </p>
      </main>
    );
  }

  const playerMap = await getPlayerMap(board.year);
  const players = Object.fromEntries(playerMap);

  return (
    <main className="mx-auto max-w-screen-xl px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/board"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          &larr; Back to Board
        </Link>
        <h1 className="text-2xl font-bold">Compare Rankings</h1>
      </div>
      <BoardCompareView
        currentRankings={board.rankings}
        snapshotRankings={snapshot.rankings}
        snapshotLabel={snapshot.label}
        snapshotDate={snapshot.createdAt?.seconds ?? null}
        players={players}
      />
    </main>
  );
}
