import { notFound } from 'next/navigation';
import { getPlayerMap } from '@/lib/data';
import { getCachedSeasonConfig } from '@/lib/cache';
import { EmbeddablePlayerCard } from '@/components/embeds/embeddable-player-card';

export default async function EmbedPlayerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { draftYear } = await getCachedSeasonConfig();
  const playerMap = await getPlayerMap(draftYear);
  const player = playerMap.get(id);
  if (!player) notFound();

  return <EmbeddablePlayerCard player={player} />;
}
