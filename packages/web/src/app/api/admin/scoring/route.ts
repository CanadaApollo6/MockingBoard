import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/firebase/auth-session';
import { isAdmin } from '@/lib/firebase/admin';
import { adminDb } from '@/lib/firebase/firebase-admin';
import { getCachedPlayers } from '@/lib/cache';
import {
  scoreMockPick,
  aggregateDraftScore,
  scoreBoardAccuracy,
} from '@/lib/scoring';
import { hydrateDoc } from '@/lib/firebase/sanitize';
import type {
  Draft,
  Pick,
  BigBoard,
  DraftResultPick,
  Player,
} from '@mockingboard/shared';

export async function GET(request: Request) {
  const session = await getSessionUser();
  if (!session)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdmin(session.uid)))
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
  if (!(await isAdmin(session.uid)))
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

  // Find all locked (prediction) drafts for this year
  const draftsSnap = await adminDb
    .collection('drafts')
    .where('status', '==', 'complete')
    .where('config.year', '==', year)
    .where('isLocked', '==', true)
    .get();

  const scored: Array<{
    draftId: string;
    draftName: string;
    userId: string;
    totalScore: number;
    percentage: number;
    pickCount: number;
  }> = [];

  // Track affected users for accuracy aggregation
  const affectedUserIds = new Set<string>();

  const batch = adminDb.batch();

  for (const draftDoc of draftsSnap.docs) {
    const draft = hydrateDoc<Draft>(draftDoc);

    // Get picks for this draft
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
      const pick = hydrateDoc<Pick>(pickDoc);
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
        isLocked: true,
        scoredAt: new Date(),
        totalScore: result.totalScore,
        maxScore: result.maxScore,
        percentage: result.percentage,
        pickCount: pickScores.length,
      });

      affectedUserIds.add(userId);

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

  // Aggregate accuracy scores for affected users
  let usersUpdated = 0;
  for (const userId of affectedUserIds) {
    const userScores = await adminDb
      .collection('draftScores')
      .where('userId', '==', userId)
      .where('isLocked', '==', true)
      .get();

    if (userScores.empty) continue;

    let totalPct = 0;
    for (const doc of userScores.docs) {
      totalPct += (doc.data().percentage as number) ?? 0;
    }
    const avgAccuracy = Math.round(totalPct / userScores.size);

    await adminDb
      .collection('users')
      .doc(userId)
      .update({ 'stats.accuracyScore': avgAccuracy });
    usersUpdated++;
  }

  // ---- Board Accuracy Scoring ----

  const boardsSnap = await adminDb
    .collection('bigBoards')
    .where('year', '==', year)
    .where('visibility', '==', 'public')
    .get();

  const boardBatch = adminDb.batch();
  let boardsScored = 0;
  const boardAffectedUserIds = new Set<string>();

  for (const boardDoc of boardsSnap.docs) {
    const board = hydrateDoc<BigBoard>(boardDoc);
    if (board.rankings.length === 0) continue;

    const result = scoreBoardAccuracy(board.rankings, actualResults, playerMap);
    if (!result) continue;

    const scoreDoc = adminDb.collection('boardScores').doc();
    boardBatch.set(scoreDoc, {
      boardId: board.id,
      boardName: board.name,
      year,
      userId: board.userId,
      matchedPlayers: result.matchedPlayers,
      avgDelta: result.avgDelta,
      percentage: result.percentage,
      scoredAt: new Date(),
    });

    boardAffectedUserIds.add(board.userId);
    boardsScored++;
  }

  if (boardsScored > 0) {
    await boardBatch.commit();
  }

  // Aggregate board accuracy scores for affected users
  let boardUsersUpdated = 0;
  for (const userId of boardAffectedUserIds) {
    const userBoardScores = await adminDb
      .collection('boardScores')
      .where('userId', '==', userId)
      .get();

    if (userBoardScores.empty) continue;

    let totalPct = 0;
    for (const doc of userBoardScores.docs) {
      totalPct += (doc.data().percentage as number) ?? 0;
    }
    const avgBoardAccuracy = Math.round(totalPct / userBoardScores.size);

    await adminDb
      .collection('users')
      .doc(userId)
      .update({ 'stats.boardAccuracyScore': avgBoardAccuracy });
    boardUsersUpdated++;
  }

  return NextResponse.json({
    ok: true,
    draftsScored: draftsSnap.size,
    resultsWritten: scored.length,
    usersUpdated,
    boardsScored,
    boardUsersUpdated,
    results: scored.slice(0, 20),
  });
}
