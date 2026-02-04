import { getPublicBoards } from '@/lib/data';
import { BoardBrowse } from './board-browse';

export const dynamic = 'force-dynamic';

export default async function BoardsPage() {
  const { boards: initialBoards, hasMore: initialHasMore } =
    await getPublicBoards({ limit: 20 });

  return (
    <main className="mx-auto max-w-screen-xl px-4 py-8">
      <div className="mb-8">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold uppercase tracking-tight sm:text-4xl">
          Community Boards
        </h1>
        <p className="mt-2 text-muted-foreground">
          Browse big boards created by the MockingBoard community.
        </p>
      </div>
      <BoardBrowse
        initialBoards={initialBoards}
        initialHasMore={initialHasMore}
      />
    </main>
  );
}
