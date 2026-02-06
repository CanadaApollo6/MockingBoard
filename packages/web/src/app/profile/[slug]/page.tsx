import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  getUserBySlug,
  getFollowCounts,
  getUserPublicBoards,
  getUserReports,
  getPlayerMap,
} from '@/lib/data';
import { FollowButton } from '@/components/follow-button';
import { BoardCard } from '@/components/board-card';
import { ReportCard } from '@/components/report-card';
import { getCachedSeasonConfig } from '@/lib/cache';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const user = await getUserBySlug(slug);

  if (!user) return {};

  const title = user.displayName;
  const description =
    user.bio ?? `${user.displayName}'s draft analyst profile on MockingBoard.`;

  return {
    title,
    description,
    openGraph: { title, description, type: 'profile' },
  };
}

export default async function ProfilePage({ params }: Props) {
  const { slug } = await params;
  const user = await getUserBySlug(slug);

  if (!user) notFound();

  const [counts, boards, reports] = await Promise.all([
    getFollowCounts(user.id),
    getUserPublicBoards(user.id),
    getUserReports(user.id),
  ]);

  // Resolve player names for reports
  const { draftYear } = await getCachedSeasonConfig();
  const playerMap = reports.length > 0 ? await getPlayerMap(draftYear) : null;

  return (
    <main className="mx-auto max-w-screen-xl px-4 py-8">
      {/* Profile header */}
      <div className="flex flex-wrap items-start gap-6">
        {user.avatar ? (
          <img
            src={user.avatar}
            alt=""
            className="h-20 w-20 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted text-2xl font-bold text-muted-foreground">
            {user.displayName.charAt(0).toUpperCase()}
          </div>
        )}

        <div className="flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold uppercase tracking-tight">
              {user.displayName}
            </h1>
            <FollowButton followeeId={user.id} />
          </div>

          {user.bio && (
            <p className="max-w-prose text-muted-foreground">{user.bio}</p>
          )}

          <div className="flex gap-4 text-sm text-muted-foreground">
            <span>
              <span className="font-medium text-foreground">
                {counts.followers}
              </span>{' '}
              followers
            </span>
            <span>
              <span className="font-medium text-foreground">
                {counts.following}
              </span>{' '}
              following
            </span>
            <span>
              <span className="font-medium text-foreground">
                {boards.length}
              </span>{' '}
              boards
            </span>
            <span>
              <span className="font-medium text-foreground">
                {reports.length}
              </span>{' '}
              reports
            </span>
          </div>

          {user.links && Object.values(user.links).some(Boolean) && (
            <div className="flex flex-wrap gap-3 text-sm">
              {user.links.twitter && (
                <a
                  href={user.links.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-mb-accent hover:underline"
                >
                  Twitter
                </a>
              )}
              {user.links.youtube && (
                <a
                  href={user.links.youtube}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-mb-accent hover:underline"
                >
                  YouTube
                </a>
              )}
              {user.links.bluesky && (
                <a
                  href={user.links.bluesky}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-mb-accent hover:underline"
                >
                  Bluesky
                </a>
              )}
              {user.links.website && (
                <a
                  href={user.links.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-mb-accent hover:underline"
                >
                  Website
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content: boards + reports */}
      <div className="mt-10 grid gap-10 lg:grid-cols-2">
        {/* Boards */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold">Big Boards</h2>
          {boards.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No public boards yet.
            </p>
          ) : (
            <div className="grid gap-4">
              {boards.map((board) => (
                <BoardCard key={board.id} board={board} />
              ))}
            </div>
          )}
        </div>

        {/* Reports */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold">Scouting Reports</h2>
          {reports.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No reports written yet.
            </p>
          ) : (
            <div className="space-y-3">
              {reports.map((report) => {
                const player = playerMap?.get(report.playerId);
                return (
                  <div key={report.id}>
                    {player && (
                      <Link
                        href={`/players/${report.playerId}`}
                        className="mb-1 block text-sm font-medium text-mb-accent hover:underline"
                      >
                        {player.name} — {player.position}, {player.school}
                      </Link>
                    )}
                    <ReportCard report={report} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
