import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getBigBoardBySlug, getPlayerMap } from '@/lib/firebase/data';
import { PublicBoardView } from '@/components/board/public-board-view';
import { DraftGuideButton } from '@/components/draft-guide/draft-guide-button';
import type { Player } from '@mockingboard/shared';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const board = await getBigBoardBySlug(slug);

  if (!board) return {};

  const title = board.name;
  const description =
    board.description ??
    `${board.name} by ${board.authorName ?? 'Anonymous'} – ${board.rankings.length} prospects ranked for the ${board.year} NFL Draft.`;

  return {
    title,
    description,
    openGraph: { title, description, type: 'article' },
  };
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
        <div className="mt-4">
          <DraftGuideButton
            boardName={board.name}
            authorName={board.authorName}
            year={board.year}
            players={rankedPlayers}
          />
        </div>
      </div>
      <PublicBoardView rankedPlayers={rankedPlayers} />
    </main>
  );
}
