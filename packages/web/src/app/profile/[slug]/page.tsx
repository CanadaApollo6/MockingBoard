import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  getUserBySlug,
  getFollowCounts,
  getUserPublicBoards,
  getUserReports,
  getUserDraftScores,
  getUserDraftingIdentity,
  getPlayerMap,
} from '@/lib/firebase/data';
import { teams } from '@mockingboard/shared';
import { Badge } from '@/components/ui/badge';
import { getSessionUser } from '@/lib/firebase/auth-session';
import { FollowButton } from '@/components/profile/follow-button';
import { ProfileShareButton } from '@/components/share/profile-share-button';
import { BoardCard } from '@/components/board/board-card';
import { ReportCard } from '@/components/community/report-card';
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

  return { title, description };
}

export default async function ProfilePage({ params }: Props) {
  const { slug } = await params;
  const user = await getUserBySlug(slug);

  if (!user) notFound();

  const [session, counts, boards, reports, draftScores, identity] =
    await Promise.all([
      getSessionUser(),
      getFollowCounts(user.id),
      getUserPublicBoards(user.id),
      getUserReports(user.id),
      getUserDraftScores(user.id),
      getUserDraftingIdentity(user.id, user.discordId),
    ]);

  const isOwnProfile = session?.uid === user.id;

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
            {isOwnProfile && (
              <ProfileShareButton
                user={user}
                boardCount={boards.length}
                reportCount={reports.length}
                topPositions={identity?.topPositions.map((p) => p.position)}
              />
            )}
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

      {/* Accuracy stats */}
      {draftScores.length > 0 && (
        <div className="mt-8 rounded-lg border bg-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Prediction Accuracy</h2>
            <Link
              href="/leaderboard"
              className="text-sm text-mb-accent hover:underline"
            >
              View Leaderboard
            </Link>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="text-center">
              <p className="font-mono text-2xl font-bold">
                {user.stats?.accuracyScore ?? 0}%
              </p>
              <p className="text-xs text-muted-foreground">Accuracy Score</p>
            </div>
            <div className="text-center">
              <p className="font-mono text-2xl font-bold">
                {draftScores.length}
              </p>
              <p className="text-xs text-muted-foreground">
                Predictions Scored
              </p>
            </div>
            <div className="text-center">
              <p className="font-mono text-2xl font-bold">
                {Math.max(...draftScores.map((s) => s.percentage))}%
              </p>
              <p className="text-xs text-muted-foreground">Best Draft Score</p>
            </div>
            <div className="text-center">
              <p className="font-mono text-2xl font-bold">
                {draftScores.reduce((sum, s) => sum + s.pickCount, 0)}
              </p>
              <p className="text-xs text-muted-foreground">
                Total Picks Scored
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Drafting Identity */}
      {identity && (
        <div className="mt-8 rounded-lg border bg-card p-5">
          <h2 className="text-lg font-bold">Drafting Identity</h2>
          <div className="mt-4 flex flex-wrap items-center gap-6">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Top Positions
              </p>
              <div className="mt-1.5 flex gap-2">
                {identity.topPositions.map(({ position, count }) => (
                  <Badge key={position} variant="outline" className="text-sm">
                    {position}{' '}
                    <span className="ml-1 text-muted-foreground">
                      ({count})
                    </span>
                  </Badge>
                ))}
              </div>
            </div>
            {identity.favoriteTeam && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Most Drafted For
                </p>
                <p className="mt-1.5 text-sm font-medium">
                  {teams.find((t) => t.id === identity.favoriteTeam)?.name ??
                    identity.favoriteTeam}
                </p>
              </div>
            )}
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Completed Drafts
              </p>
              <p className="mt-1.5 font-mono text-sm font-bold">
                {identity.totalDrafts}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Total Picks
              </p>
              <p className="mt-1.5 font-mono text-sm font-bold">
                {identity.totalPicks}
              </p>
            </div>
          </div>
        </div>
      )}

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
