import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-session';
import { isAdmin } from '@/lib/admin';
import { adminDb } from '@/lib/firebase-admin';
import { getCachedPlayers } from '@/lib/cache';
import { scoreMockPick, aggregateDraftScore } from '@/lib/scoring';
import type {
  Draft,
  Pick,
  DraftResultPick,
  Player,
} from '@mockingboard/shared';

export async function GET(request: Request) {
  const session = await getSessionUser();
  if (!session)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdmin(session.uid))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const year = parseInt(searchParams.get('year') ?? '');
  if (!year)
    return NextResponse.json({ error: 'Year is required' }, { status: 400 });

  // Check if actual results exist
  const resultsDoc = await adminDb
    .collection('draftResults')
    .doc(`${year}`)
    .get();
  const hasResults =
    resultsDoc.exists &&
    (resultsDoc.data()?.picks as DraftResultPick[])?.length > 0;

  // Check existing scores
  const scoresSnap = await adminDb
    .collection('draftScores')
    .where('year', '==', year)
    .limit(1)
    .get();

  return NextResponse.json({
    year,
    hasResults,
    hasScores: !scoresSnap.empty,
    scoreCount: scoresSnap.size,
  });
}

export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdmin(session.uid))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();
  const year = body.year as number;
  if (!year)
    return NextResponse.json({ error: 'Year required' }, { status: 400 });

  // Load actual results
  const resultsDoc = await adminDb
    .collection('draftResults')
    .doc(`${year}`)
    .get();
  if (!resultsDoc.exists)
    return NextResponse.json(
      { error: 'No actual results for this year' },
      { status: 400 },
    );

  const actualResults = (resultsDoc.data()?.picks as DraftResultPick[]) ?? [];
  if (actualResults.length === 0)
    return NextResponse.json(
      { error: 'No picks in actual results' },
      { status: 400 },
    );

  // Load player data for name resolution
  const players = await getCachedPlayers(year);
  const playerMap = new Map<string, Player>();
  for (const p of players) playerMap.set(p.id, p);

  // Find all completed drafts for this year
  const draftsSnap = await adminDb
    .collection('drafts')
    .where('status', '==', 'complete')
    .where('config.year', '==', year)
    .get();

  const scored: Array<{
    draftId: string;
    draftName: string;
    userId: string;
    totalScore: number;
    percentage: number;
    pickCount: number;
  }> = [];

  const batch = adminDb.batch();

  for (const draftDoc of draftsSnap.docs) {
    const draft = { id: draftDoc.id, ...draftDoc.data() } as Draft;

    // Get picks for this draft — stored in subcollection or inline
    const picksSnap = await adminDb
      .collection('drafts')
      .doc(draft.id)
      .collection('picks')
      .orderBy('overall')
      .get();

    if (picksSnap.empty) continue;

    // Group picks by user
    const picksByUser = new Map<string, Pick[]>();
    for (const pickDoc of picksSnap.docs) {
      const pick = { id: pickDoc.id, ...pickDoc.data() } as Pick;
      const userId = pick.userId ?? draft.createdBy;
      const arr = picksByUser.get(userId) ?? [];
      arr.push(pick);
      picksByUser.set(userId, arr);
    }

    for (const [userId, userPicks] of picksByUser) {
      const pickScores = userPicks.map((pick) => {
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

      const scoreDoc = adminDb.collection('draftScores').doc();
      batch.set(scoreDoc, {
        draftId: draft.id,
        year,
        userId,
        scoredAt: new Date(),
        totalScore: result.totalScore,
        maxScore: result.maxScore,
        percentage: result.percentage,
        pickCount: pickScores.length,
      });

      scored.push({
        draftId: draft.id,
        draftName: draft.name ?? draft.id,
        userId,
        totalScore: result.totalScore,
        percentage: result.percentage,
        pickCount: pickScores.length,
      });
    }
  }

  if (scored.length > 0) {
    await batch.commit();
  }

  return NextResponse.json({
    ok: true,
    draftsScored: draftsSnap.size,
    resultsWritten: scored.length,
    results: scored.slice(0, 20),
  });
}
