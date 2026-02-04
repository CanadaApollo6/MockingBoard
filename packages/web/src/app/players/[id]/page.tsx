import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPlayerMap, getPlayerReports, getPlayerVideos } from '@/lib/data';
import { PlayerHero } from '@/components/player-hero';
import { PlayerJsonLd } from './json-ld';
import { ProspectDetails } from '@/components/prospect-details';
import { CommunityGradeSummary } from '@/components/community-grade-summary';
import { CommunityReports } from '@/components/community-reports';
import { VideoGallery } from '@/components/video-gallery';

const CURRENT_YEAR = 2026;

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const playerMap = await getPlayerMap(CURRENT_YEAR);
  const player = playerMap.get(id);

  if (!player) return {};

  const title = `${player.name} – ${player.position}, ${player.school}`;
  const description =
    player.scouting?.summary ??
    `${player.name} is a ${player.position} from ${player.school}. View scouting reports, measurables, and community grades on MockingBoard.`;

  return {
    title,
    description,
    openGraph: { title, description, type: 'profile' },
  };
}

export default async function PlayerPage({ params }: Props) {
  const { id } = await params;
  const playerMap = await getPlayerMap(CURRENT_YEAR);
  const player = playerMap.get(id);

  if (!player) notFound();

  const [reports, videos] = await Promise.all([
    getPlayerReports(id),
    getPlayerVideos(id),
  ]);

  return (
    <main className="mx-auto max-w-screen-xl px-4 py-8">
      <PlayerJsonLd player={player} />
      <PlayerHero player={player} />

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
        {/* Left: Consensus scouting data */}
        <div className="space-y-6">
          <h2 className="text-lg font-bold">Consensus Scouting</h2>
          <ProspectDetails player={player} reportCount={reports.length} />
        </div>

        {/* Right: Community content */}
        <div className="space-y-6">
          {reports.length > 0 && <CommunityGradeSummary reports={reports} />}

          <CommunityReports
            playerId={id}
            playerName={player.name}
            year={CURRENT_YEAR}
            initialReports={reports}
          />
        </div>
      </div>

      {/* Video breakdowns — full width below the two-column layout */}
      <div className="mt-10">
        <VideoGallery
          playerId={id}
          playerName={player.name}
          initialVideos={videos}
        />
      </div>
    </main>
  );
}
