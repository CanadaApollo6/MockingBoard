import { getSessionUser } from '@/lib/auth-session';
import { resolveUser } from '@/lib/user-resolve';
import {
  getPlayerMap,
  getRecentCompletedDraft,
  getDraft,
  getTopDrafters,
} from '@/lib/data';
import { LandingHero } from '@/components/landing-hero';
import { Dashboard } from '@/components/dashboard';
import { getProspectOfTheDay } from '@/lib/prospect';
import { getCachedSeasonConfig } from '@/lib/cache';
import { adminDb } from '@/lib/firebase-admin';

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

    const featured = featuredDoc?.data() as
      | {
          prospectOfTheDay?: { playerId: string; overrideUntil: number };
          draftOfTheWeek?: { draftId: string; overrideUntil: number };
        }
      | undefined;

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
        userStats={user?.stats}
        prospect={getProspectOfTheDay(playerMap, featured?.prospectOfTheDay)}
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
