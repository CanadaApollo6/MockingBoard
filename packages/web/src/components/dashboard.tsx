import Link from 'next/link';
import type { Player, Draft, User, SeasonOverview } from '@mockingboard/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GradientCard } from '@/components/ui/gradient-card';
import { getSchoolColor } from '@/lib/school-colors';
import { SeasonOverviewCard } from './team-breakdown/season-overview-card';

interface DashboardProps {
  displayName: string;
  userStats?: {
    totalDrafts: number;
    totalPicks: number;
    accuracyScore?: number;
  };
  prospect: Player | null;
  draftOfWeek: Draft | null;
  leaderboard: User[];
  followedTeam?: {
    abbreviation: string;
    name: string;
    colors: { primary: string; secondary: string };
    record?: string;
    seasonOverview?: SeasonOverview;
  };
}

export function Dashboard({
  displayName,
  userStats,
  prospect,
  draftOfWeek,
  leaderboard,
  followedTeam,
}: DashboardProps) {
  return (
    <main className="mx-auto max-w-screen-xl px-4 py-8">
      {/* Greeting + Quick Actions */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Welcome back, {displayName}</h1>
        <div className="flex flex-wrap gap-2">
          <Link href="/drafts/new">
            <Button size="sm">New Draft</Button>
          </Link>
          <Link href="/lobbies">
            <Button variant="outline" size="sm">
              Join Lobby
            </Button>
          </Link>
          <Link href="/board">
            <Button variant="outline" size="sm">
              My Board
            </Button>
          </Link>
          <Link href="/players">
            <Button variant="outline" size="sm">
              Players
            </Button>
          </Link>
        </div>
      </div>

      {/* Widget Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Prospect of the Day */}
        {prospect ? (
          <GradientCard
            from={getSchoolColor(prospect.school).primary}
            to={getSchoolColor(prospect.school).secondary}
          >
            <div className="p-5">
              <p className="mb-3 text-xs font-medium uppercase tracking-widest text-white/70">
                Prospect of the Day
              </p>
              <Link href={`/players/${prospect.id}`} className="group">
                <p className="font-[family-name:var(--font-display)] text-xl font-bold uppercase tracking-tight group-hover:text-white/80">
                  {prospect.name}
                </p>
              </Link>
              <p className="mt-1 text-sm text-white/70">
                #{prospect.consensusRank} · {prospect.position} ·{' '}
                {prospect.school}
              </p>
              {prospect.scouting?.comparison && (
                <p className="mt-2 text-sm">
                  <span className="text-white/70">NFL Comp:</span>{' '}
                  <span className="font-medium">
                    {prospect.scouting.comparison}
                  </span>
                </p>
              )}
              {prospect.scouting?.summary && (
                <p className="mt-2 line-clamp-2 text-sm text-white/70">
                  {prospect.scouting.summary}
                </p>
              )}
            </div>
          </GradientCard>
        ) : (
          <Card>
            <CardContent className="p-5">
              <p className="mb-3 text-xs font-medium uppercase tracking-widest text-muted-foreground">
                Prospect of the Day
              </p>
              <p className="text-sm text-muted-foreground">
                No prospects available.
              </p>
            </CardContent>
          </Card>
        )}

        {/* User Stats */}
        <Card>
          <CardContent className="p-5">
            <p className="mb-3 text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Your Stats
            </p>
            {userStats && userStats.totalDrafts > 0 ? (
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="font-mono text-2xl font-bold">
                    {userStats.totalDrafts}
                  </p>
                  <p className="text-xs text-muted-foreground">Drafts</p>
                </div>
                <div>
                  <p className="font-mono text-2xl font-bold">
                    {userStats.totalPicks}
                  </p>
                  <p className="text-xs text-muted-foreground">Picks</p>
                </div>
                <div>
                  <p className="font-mono text-2xl font-bold">
                    {userStats.accuracyScore != null
                      ? `${userStats.accuracyScore}%`
                      : '—'}
                  </p>
                  <p className="text-xs text-muted-foreground">Accuracy</p>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-sm text-muted-foreground">No drafts yet.</p>
                <Link href="/drafts/new">
                  <Button size="sm" className="mt-3">
                    Start Your First Draft
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Mock Draft of the Week */}
        <Card>
          <CardContent className="p-5">
            <p className="mb-3 text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Mock Draft of the Week
            </p>
            {draftOfWeek ? (
              <Link href={`/drafts/${draftOfWeek.id}`} className="group">
                <p className="font-medium group-hover:text-primary">
                  {draftOfWeek.name || 'Mock Draft'}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {Object.keys(draftOfWeek.participants).length} participants
                  {' · '}
                  {draftOfWeek.config.rounds} round
                  {draftOfWeek.config.rounds !== 1 ? 's' : ''}
                </p>
                {draftOfWeek.updatedAt && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Completed{' '}
                    {new Date(
                      draftOfWeek.updatedAt.seconds * 1000,
                    ).toLocaleDateString()}
                  </p>
                )}
              </Link>
            ) : (
              <p className="text-sm text-muted-foreground">
                No completed drafts yet. Be the first!
              </p>
            )}
          </CardContent>
        </Card>

        {/* Leaderboard Top 5 */}
        <Card>
          <CardContent className="p-5">
            <p className="mb-3 text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Leaderboard
            </p>
            {leaderboard.length > 0 ? (
              <ol className="space-y-2">
                {leaderboard.map((u, i) => (
                  <li key={u.id} className="flex items-baseline gap-3 text-sm">
                    <span className="font-mono text-xs text-muted-foreground">
                      {i + 1}
                    </span>
                    {u.slug && u.isPublic ? (
                      <Link
                        href={`/profile/${u.slug}`}
                        className="font-medium hover:text-primary"
                      >
                        {u.displayName}
                      </Link>
                    ) : (
                      <span className="font-medium">{u.displayName}</span>
                    )}
                    <span className="ml-auto text-xs text-muted-foreground">
                      {u.stats?.totalDrafts ?? 0} drafts
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-muted-foreground">
                No leaderboard data yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Followed Team Season Overview */}
      {followedTeam &&
        (() => {
          const { record, seasonOverview } = followedTeam;
          const hasData =
            record ||
            seasonOverview?.finalResult ||
            seasonOverview?.divisionResult ||
            (seasonOverview?.accolades && seasonOverview.accolades.length > 0);

          if (!hasData) return null;

          return (
            <Link
              href={`/teams/${followedTeam.abbreviation}`}
              className="mt-6 block"
            >
              <SeasonOverviewCard team={followedTeam} showTeamName />
            </Link>
          );
        })()}
    </main>
  );
}
