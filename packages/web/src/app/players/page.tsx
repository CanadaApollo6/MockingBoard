import type { Metadata } from 'next';
import { getCachedPlayers } from '@/lib/cache';
import { ProspectBigBoard } from './prospect-big-board';

const CURRENT_YEAR = 2026;

export const metadata: Metadata = {
  title: '2026 Big Board',
  description:
    'Consensus 2026 NFL Draft prospect rankings with scouting reports, combine measurables, and stats.',
};

export default async function PlayersPage() {
  const players = await getCachedPlayers(CURRENT_YEAR);

  return (
    <main className="mx-auto max-w-screen-xl px-4 py-8">
      <div className="mb-8">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold uppercase tracking-tight sm:text-4xl">
          2026 Big Board
        </h1>
        <p className="mt-2 text-muted-foreground">
          Consensus prospect rankings with scouting reports, measurables, and
          stats.
        </p>
      </div>
      <ProspectBigBoard players={players} />
    </main>
  );
}
