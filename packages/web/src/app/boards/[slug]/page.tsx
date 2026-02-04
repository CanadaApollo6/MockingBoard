import { notFound } from 'next/navigation';
import { getBigBoardBySlug, getPlayerMap } from '@/lib/data';
import { PublicBoardView } from '@/components/public-board-view';
import type { Player } from '@mockingboard/shared';

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function PublicBoardPage({ params }: Props) {
  const { slug } = await params;
  const board = await getBigBoardBySlug(slug);

  if (!board) notFound();

  const playerMap = await getPlayerMap(board.year);

  // Resolve ranked players in board order
  const rankedPlayers: Player[] = [];
  for (const id of board.rankings) {
    const player = playerMap.get(id);
    if (player) rankedPlayers.push(player);
  }

  const updated = board.updatedAt?.seconds
    ? new Date(board.updatedAt.seconds * 1000).toLocaleDateString()
    : null;

  return (
    <main className="mx-auto max-w-screen-xl px-4 py-8">
      <div className="mb-8">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold uppercase tracking-tight sm:text-4xl">
          {board.name}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          {board.authorName && <span>by {board.authorName}</span>}
          <span>{board.year}</span>
          <span>{board.rankings.length} players</span>
          {updated && <span>Updated {updated}</span>}
        </div>
        {board.description && (
          <p className="mt-3 text-muted-foreground">{board.description}</p>
        )}
      </div>
      <PublicBoardView rankedPlayers={rankedPlayers} />
    </main>
  );
}
