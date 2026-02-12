import { getSessionUser } from '@/lib/firebase/auth-session';
import { resolveUser } from '@/lib/firebase/user-resolve';
import {
  getPlayerMap,
  getRecentCompletedDraft,
  getDraft,
  getTopDrafters,
  getUserStats,
} from '@/lib/firebase/data';
import { teams } from '@mockingboard/shared';
import { LandingHero } from '@/components/landing-hero';
import { Dashboard } from '@/components/dashboard';
import { getProspectOfTheDay } from '@/lib/prospect';
import {
  getCachedSeasonConfig,
  getCachedTeamDocs,
  getCachedSchedule,
} from '@/lib/cache';
import { TEAM_COLORS } from '@/lib/colors/team-colors';
import { adminDb } from '@/lib/firebase/firebase-admin';

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await getSessionUser();

  if (session) {
    const { draftYear } = await getCachedSeasonConfig();
    const [user, playerMap, featuredDoc, leaderboard] = await Promise.all([
      resolveUser(session.uid).catch(() => null),
      getPlayerMap(draftYear).catch(() => new Map<string, never>()),
      adminDb
        .collection('config')
        .doc('featured')
        .get()
        .catch(() => null),
      getTopDrafters(5).catch(() => [] as never[]),
    ]);

    const stats = await getUserStats(session.uid, user?.discordId).catch(
      () => ({ totalDrafts: 0, totalPicks: 0 }),
    );

    const featured = featuredDoc?.data() as
      | {
          prospectOfTheDay?: { playerId: string; overrideUntil: number };
          draftOfTheWeek?: { draftId: string; overrideUntil: number };
        }
      | undefined;

    // Followed team season overview
    let followedTeamData = undefined;
    if (user?.followedTeam) {
      const abbr = user.followedTeam;
      const teamInfo = teams.find((t) => t.id === abbr);
      const [teamDocs, schedule] = await Promise.all([
        getCachedTeamDocs().catch(() => []),
        getCachedSchedule(abbr).catch(() => null),
      ]);
      const teamDoc = teamDocs.find((d) => d.id === abbr);
      const lastGame = schedule?.games[schedule.games.length - 1];
      const colors = TEAM_COLORS[abbr];

      followedTeamData = {
        abbreviation: abbr,
        name: teamInfo?.name ?? abbr,
        colors: { primary: colors.primary, secondary: colors.secondary },
        record: lastGame?.record,
        seasonOverview: teamDoc?.seasonOverview,
      };
    }

    // Resolve draft of the week: check override first, then fall back to recent
    let draftOfWeek = null;
    const draftOverride = featured?.draftOfTheWeek;
    if (draftOverride && draftOverride.overrideUntil > Date.now()) {
      draftOfWeek = await getDraft(draftOverride.draftId).catch(() => null);
    }
    if (!draftOfWeek) {
      draftOfWeek = await getRecentCompletedDraft().catch(() => null);
    }

    return (
      <Dashboard
        displayName={user?.displayName ?? 'User'}
        userStats={
          stats.totalDrafts > 0
            ? { ...stats, accuracyScore: user?.stats?.accuracyScore }
            : undefined
        }
        prospect={getProspectOfTheDay(playerMap, featured?.prospectOfTheDay)}
        draftOfWeek={draftOfWeek}
        leaderboard={leaderboard}
        followedTeam={followedTeamData}
      />
    );
  }

  const { error } = await searchParams;
  return (
    <main>
      <LandingHero error={!!error} />
    </main>
  );
}
