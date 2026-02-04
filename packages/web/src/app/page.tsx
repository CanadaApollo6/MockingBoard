import { getSessionUser } from '@/lib/auth-session';
import { resolveUser } from '@/lib/user-resolve';
import {
  getPlayerMap,
  getRecentCompletedDraft,
  getTopDrafters,
} from '@/lib/data';
import { LandingHero } from '@/components/landing-hero';
import { Dashboard } from '@/components/dashboard';
import { getProspectOfTheDay } from '@/lib/prospect';

const CURRENT_YEAR = 2026;

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await getSessionUser();

  if (session) {
    const [user, playerMap, draftOfWeek, leaderboard] = await Promise.all([
      resolveUser(session.uid),
      getPlayerMap(CURRENT_YEAR),
      getRecentCompletedDraft(),
      getTopDrafters(5),
    ]);

    return (
      <Dashboard
        displayName={user?.displayName ?? 'User'}
        userStats={user?.stats}
        prospect={getProspectOfTheDay(playerMap)}
        draftOfWeek={draftOfWeek}
        leaderboard={leaderboard}
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
