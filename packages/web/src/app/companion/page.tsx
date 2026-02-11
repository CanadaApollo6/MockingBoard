import { redirect } from 'next/navigation';
import { getDraftPicks, getDraftResults, getPlayerMap } from '@/lib/data';
import { adminDb } from '@/lib/firebase-admin';
import { getSessionUser } from '@/lib/auth-session';
import { resolveUser } from '@/lib/user-resolve';
import { getCachedSeasonConfig } from '@/lib/cache';
import { hydrateDoc } from '@/lib/sanitize';
import { scoreMockPick, aggregateDraftScore } from '@/lib/scoring';
import type { Draft, DraftResultPick, Pick } from '@mockingboard/shared';
import type { PickScore, DraftScoreResult } from '@/lib/scoring';
import { CompanionClient } from './companion-client';

interface ScoredDraft {
  draftId: string;
  draftName: string;
  picks: Pick[];
  pickScores: PickScore[];
  result: DraftScoreResult;
}

export default async function CompanionPage() {
  const session = await getSessionUser();
  if (!session) redirect('/');

  const user = await resolveUser(session.uid);
  const { draftYear } = await getCachedSeasonConfig();

  // Find user's locked drafts for the current year
  const userIds = [session.uid, user?.discordId].filter(Boolean) as string[];
  const draftsSnap = await adminDb
    .collection('drafts')
    .where('status', '==', 'complete')
    .where('config.year', '==', draftYear)
    .where('isLocked', '==', true)
    .where('participantIds', 'array-contains-any', userIds)
    .get();

  const lockedDrafts = draftsSnap.docs.map((d) => hydrateDoc<Draft>(d));

  // Load actual results + player map
  const [actualResults, playerMap] = await Promise.all([
    getDraftResults(draftYear),
    getPlayerMap(draftYear),
  ]);

  // Score each locked draft against actual results
  const scoredDrafts: ScoredDraft[] = [];
  for (const draft of lockedDrafts) {
    const picks = await getDraftPicks(draft.id);
    if (picks.length === 0) continue;

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

    scoredDrafts.push({
      draftId: draft.id,
      draftName: draft.name ?? draft.id,
      picks,
      pickScores,
      result: aggregateDraftScore(pickScores),
    });
  }

  // Serialize actual results for client
  const resultsForClient: DraftResultPick[] = actualResults;

  return (
    <main className="mx-auto max-w-screen-xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-bold">Draft Companion</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Compare your locked predictions against actual {draftYear} NFL Draft
        results in real time.
      </p>
      <CompanionClient
        year={draftYear}
        scoredDrafts={scoredDrafts.map((sd) => ({
          draftId: sd.draftId,
          draftName: sd.draftName,
          picks: sd.picks,
          pickScores: sd.pickScores,
          totalScore: sd.result.totalScore,
          maxScore: sd.result.maxScore,
          percentage: sd.result.percentage,
        }))}
        actualResults={resultsForClient}
      />
    </main>
  );
}
