import { adminDb } from '@/lib/firebase/firebase-admin';
import {
  getDraftResults,
  getDraftPicks,
  getPlayerMap,
} from '@/lib/firebase/data';
import { getSessionUser } from '@/lib/firebase/auth-session';
import { resolveUser } from '@/lib/firebase/user-resolve';
import { getCachedSeasonConfig } from '@/lib/cache';
import { hydrateDoc } from '@/lib/firebase/sanitize';
import { scoreMockPick, aggregateDraftScore } from '@/lib/scoring';
import type { Draft } from '@mockingboard/shared';
import type { PickScore } from '@/lib/scoring';
import { DraftDayClient } from './draft-day-client';

interface UserPrediction {
  draftId: string;
  draftName: string;
  pickScores: PickScore[];
  percentage: number;
}

export default async function DraftDayPage() {
  const { draftYear } = await getCachedSeasonConfig();

  // Load config + results in parallel
  const [configDoc, actualResults, session] = await Promise.all([
    adminDb.doc('config/draftDay').get(),
    getDraftResults(draftYear),
    getSessionUser(),
  ]);

  const configData = configDoc.data() ?? {};
  const config = {
    mode: configData.mode ?? 'countdown',
    currentPick: (configData.currentPick as number) ?? 0,
    clockExpiresAt:
      configData.clockExpiresAt?.toDate?.()?.toISOString() ?? null,
  };

  // Load user's prediction data if authenticated
  let prediction: UserPrediction | null = null;
  if (session) {
    const user = await resolveUser(session.uid);
    const userIds = [session.uid, user?.discordId].filter(Boolean) as string[];

    const draftsSnap = await adminDb
      .collection('drafts')
      .where('status', '==', 'complete')
      .where('config.year', '==', draftYear)
      .where('isLocked', '==', true)
      .where('participantIds', 'array-contains-any', userIds)
      .limit(1)
      .get();

    if (!draftsSnap.empty) {
      const draft = hydrateDoc<Draft>(draftsSnap.docs[0]);
      const [picks, playerMap] = await Promise.all([
        getDraftPicks(draft.id),
        getPlayerMap(draftYear),
      ]);

      if (picks.length > 0) {
        const pickScores = picks.map((pick) => {
          const player = playerMap.get(pick.playerId);
          return scoreMockPick(
            player?.name ?? 'Unknown',
            pick.team,
            player?.position ?? '',
            pick.overall,
            actualResults,
          );
        });
        const result = aggregateDraftScore(pickScores);
        prediction = {
          draftId: draft.id,
          draftName: draft.name ?? draft.id,
          pickScores,
          percentage: result.percentage,
        };
      }
    }
  }

  return (
    <main className="mx-auto max-w-screen-2xl px-4 py-8">
      <DraftDayClient
        year={draftYear}
        initialConfig={config}
        initialResults={actualResults}
        prediction={prediction}
      />
    </main>
  );
}
