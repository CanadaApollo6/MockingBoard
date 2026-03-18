import type { Metadata } from 'next';
import { getCachedSeasonConfig } from '@/lib/cache';
import { getConsensusBoard, getPlayerMap } from '@/lib/firebase/data';
import { PublicBoardView } from '@/components/board/public-board-view';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Consensus Board',
  description:
    'Community-aggregated NFL Draft prospect rankings computed from all public big boards on MockingBoard.',
};

export default async function ConsensusPage() {
  const { draftYear } = await getCachedSeasonConfig();
  const [consensus, playerMap] = await Promise.all([
    getConsensusBoard(draftYear),
    getPlayerMap(draftYear),
  ]);

  const rankedPlayers = consensus.entries
    .map((e) => playerMap.get(e.playerId))
    .filter((p) => p != null);

  const lastUpdated = consensus.lastUpdated
    ? new Date(consensus.lastUpdated * 1000).toLocaleDateString()
    : null;

  return (
    <main className="mx-auto max-w-screen-xl px-4 py-8">
      <div className="mb-8">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold uppercase tracking-tight sm:text-4xl">
          Consensus Board
        </h1>
        <p className="mt-2 text-muted-foreground">
          Community-aggregated rankings from {consensus.totalBoards} public
          boards by {consensus.totalScouts} scouts.
          {lastUpdated && <> Last updated {lastUpdated}.</>}
        </p>
      </div>

      {rankedPlayers.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          Not enough public boards yet to generate a consensus. At least 3
          boards must rank a player for them to appear here.
        </p>
      ) : (
        <PublicBoardView rankedPlayers={rankedPlayers} />
      )}
    </main>
  );
}
