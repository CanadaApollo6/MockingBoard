import type { Metadata } from 'next';
import { getCachedAllRosters } from '@/lib/cache';
import { NflPlayerDirectory } from '@/components/nfl-player/nfl-player-directory';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'NFL Players',
  description:
    'Browse active NFL players across all 32 teams with stats, career data, and player info.',
};

export default async function NflPlayersPage() {
  const players = await getCachedAllRosters();

  return (
    <main className="mx-auto max-w-screen-xl px-4 py-8">
      <div className="mb-8">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold uppercase tracking-tight sm:text-4xl">
          NFL Players
        </h1>
        <p className="mt-2 text-muted-foreground">
          Browse players across all 32 NFL teams.
        </p>
      </div>
      <NflPlayerDirectory players={players} />
    </main>
  );
}
