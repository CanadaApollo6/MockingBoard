import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { getCachedEspnPlayerBio, getCachedEspnPlayerData } from '@/lib/cache';
import { NflPlayerHero } from '@/components/nfl-player/nfl-player-hero';
import { NflPlayerStats } from '@/components/nfl-player/nfl-player-stats';

export const revalidate = 3600;

interface Props {
  params: Promise<{ espnId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { espnId } = await params;
  const bio = await getCachedEspnPlayerBio(espnId);

  if (!bio) return {};

  const title = `${bio.displayName} – ${bio.position}, ${bio.teamDisplayName}`;
  const description = `${bio.displayName} stats, career data, and player info on MockingBoard.`;

  return { title, description, openGraph: { title, description } };
}

export default async function NflPlayerPage({ params }: Props) {
  const { espnId } = await params;
  const data = await getCachedEspnPlayerData(espnId);

  if (!data) notFound();

  return (
    <main className="mx-auto max-w-screen-xl px-4 py-8">
      <Link
        href="/players"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        All Players
      </Link>

      <NflPlayerHero bio={data.bio} />

      <div className="mt-8">
        <NflPlayerStats
          statCategories={data.statCategories}
          gameLog={data.gameLog}
        />
      </div>
    </main>
  );
}
