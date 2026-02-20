import type { Metadata } from 'next';
import { getCachedEspnPlayerBio, getCachedEspnPlayerStats } from '@/lib/cache';
import { PlayerCompare } from '@/components/nfl-player/player-compare';

export const revalidate = 3600;

interface Props {
  searchParams: Promise<{ p1?: string; p2?: string }>;
}

export async function generateMetadata({
  searchParams,
}: Props): Promise<Metadata> {
  const { p1, p2 } = await searchParams;

  if (p1 && p2) {
    const [bio1, bio2] = await Promise.all([
      getCachedEspnPlayerBio(p1),
      getCachedEspnPlayerBio(p2),
    ]);
    if (bio1 && bio2) {
      const title = `${bio1.displayName} vs. ${bio2.displayName} — ${bio1.position} Comparison`;
      const description = `Side-by-side stat comparison of ${bio1.displayName} and ${bio2.displayName} on MockingBoard.`;
      return { title, description, openGraph: { title, description } };
    }
  }

  return {
    title: 'Player Comparison — MockingBoard',
    description:
      'Compare NFL players side by side with career stats, season trajectories, and biographical data.',
  };
}

export default async function PlayerComparePage({ searchParams }: Props) {
  const { p1, p2 } = await searchParams;

  const [player1, player2] = await Promise.all([
    p1 ? fetchPlayerCompareData(p1) : null,
    p2 ? fetchPlayerCompareData(p2) : null,
  ]);

  return (
    <main className="mx-auto max-w-screen-xl px-4 py-8">
      <h1 className="sr-only">Player Comparison</h1>
      <PlayerCompare player1={player1} player2={player2} />
    </main>
  );
}

async function fetchPlayerCompareData(espnId: string) {
  const [bio, statCategories] = await Promise.all([
    getCachedEspnPlayerBio(espnId),
    getCachedEspnPlayerStats(espnId),
  ]);
  if (!bio) return null;
  return { bio, statCategories };
}
