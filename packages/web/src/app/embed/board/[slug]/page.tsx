import { notFound } from 'next/navigation';
import { getBigBoardBySlug, getPlayerMap } from '@/lib/data';
import { EmbeddableBoardView } from '@/components/embeds/embeddable-board-view';
import type { Player } from '@mockingboard/shared';

export default async function EmbedBoardPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ maxHeight?: string; count?: string }>;
}) {
  const [{ slug }, { maxHeight, count }] = await Promise.all([
    params,
    searchParams,
  ]);
  const board = await getBigBoardBySlug(slug);
  if (!board) notFound();

  const playerMap = await getPlayerMap(board.year);
  const rankedPlayers: Player[] = [];
  for (const id of board.rankings) {
    const player = playerMap.get(id);
    if (player) rankedPlayers.push(player);
  }

  const displayCount = parseInt(count ?? '50', 10);

  return (
    <EmbeddableBoardView
      boardName={board.name}
      authorName={board.authorName}
      players={rankedPlayers.slice(0, displayCount)}
      maxHeight={maxHeight ? parseInt(maxHeight, 10) : undefined}
    />
  );
}
