import { Timestamp, adminDb } from './shared';
import type { DraftResultPick } from '@mockingboard/shared';

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  slug?: string;
  isPublic?: boolean;
  avgScore: number;
  draftCount: number;
}

export async function getYearLeaderboard(
  year: number,
): Promise<LeaderboardEntry[]> {
  const scoresSnap = await adminDb
    .collection('draftScores')
    .where('year', '==', year)
    .where('isLocked', '==', true)
    .limit(500)
    .get();

  if (scoresSnap.empty) return [];

  // Group by userId
  const byUser = new Map<string, { totalPct: number; count: number }>();
  for (const doc of scoresSnap.docs) {
    const data = doc.data();
    const userId = data.userId as string;
    const pct = (data.percentage as number) ?? 0;
    const existing = byUser.get(userId) ?? { totalPct: 0, count: 0 };
    existing.totalPct += pct;
    existing.count++;
    byUser.set(userId, existing);
  }

  // Resolve user display names
  const userIds = [...byUser.keys()];
  const userDocs = await Promise.all(
    userIds.map((id) => adminDb.collection('users').doc(id).get()),
  );

  const entries: LeaderboardEntry[] = [];
  for (let i = 0; i < userIds.length; i++) {
    const userId = userIds[i];
    const agg = byUser.get(userId)!;
    const userData = userDocs[i].data();
    entries.push({
      userId,
      displayName: (userData?.displayName as string) ?? 'Unknown',
      slug: userData?.slug as string | undefined,
      isPublic: userData?.isPublic as boolean | undefined,
      avgScore: Math.round(agg.totalPct / agg.count),
      draftCount: agg.count,
    });
  }

  return entries.sort((a, b) => b.avgScore - a.avgScore);
}

// ---- Draft Results & Scores ----

export async function getDraftResults(
  year: number,
): Promise<DraftResultPick[]> {
  const doc = await adminDb.collection('draftResults').doc(`${year}`).get();
  if (!doc.exists) return [];
  return (doc.data()?.picks as DraftResultPick[]) ?? [];
}

export interface DraftScoreDoc {
  draftId: string;
  year: number;
  totalScore: number;
  maxScore: number;
  percentage: number;
  pickCount: number;
  scoredAt: Date;
}

export async function getUserDraftScores(
  userId: string,
): Promise<DraftScoreDoc[]> {
  const snapshot = await adminDb
    .collection('draftScores')
    .where('userId', '==', userId)
    .where('isLocked', '==', true)
    .get();

  return snapshot.docs.map((doc) => {
    const d = doc.data();
    return {
      draftId: d.draftId as string,
      year: d.year as number,
      totalScore: d.totalScore as number,
      maxScore: d.maxScore as number,
      percentage: d.percentage as number,
      pickCount: d.pickCount as number,
      scoredAt:
        d.scoredAt instanceof Timestamp ? d.scoredAt.toDate() : d.scoredAt,
    };
  });
}

// ---- Board Accuracy Scores ----

export interface BoardScoreDoc {
  boardId: string;
  boardName: string;
  year: number;
  percentage: number;
  matchedPlayers: number;
  scoredAt: Date;
}

export async function getUserBoardScores(
  userId: string,
): Promise<BoardScoreDoc[]> {
  const snapshot = await adminDb
    .collection('boardScores')
    .where('userId', '==', userId)
    .get();

  return snapshot.docs.map((doc) => {
    const d = doc.data();
    return {
      boardId: d.boardId as string,
      boardName: d.boardName as string,
      year: d.year as number,
      percentage: d.percentage as number,
      matchedPlayers: d.matchedPlayers as number,
      scoredAt:
        d.scoredAt instanceof Timestamp ? d.scoredAt.toDate() : d.scoredAt,
    };
  });
}

export async function getBoardScore(boardId: string): Promise<number | null> {
  const snapshot = await adminDb
    .collection('boardScores')
    .where('boardId', '==', boardId)
    .limit(1)
    .get();

  if (snapshot.empty) return null;
  return (snapshot.docs[0].data().percentage as number) ?? null;
}

export interface BoardLeaderboardEntry {
  userId: string;
  displayName: string;
  slug?: string;
  isPublic?: boolean;
  avgScore: number;
  boardCount: number;
}

export async function getBoardLeaderboard(
  year?: number,
): Promise<BoardLeaderboardEntry[]> {
  let query = adminDb.collection('boardScores') as FirebaseFirestore.Query;
  if (year) query = query.where('year', '==', year);
  const snapshot = await query.get();

  if (snapshot.empty) return [];

  const byUser = new Map<string, { totalPct: number; count: number }>();
  for (const doc of snapshot.docs) {
    const data = doc.data();
    const userId = data.userId as string;
    const pct = (data.percentage as number) ?? 0;
    const existing = byUser.get(userId) ?? { totalPct: 0, count: 0 };
    existing.totalPct += pct;
    existing.count++;
    byUser.set(userId, existing);
  }

  const userIds = [...byUser.keys()];
  const userDocs = await Promise.all(
    userIds.map((id) => adminDb.collection('users').doc(id).get()),
  );

  const entries: BoardLeaderboardEntry[] = [];
  for (let i = 0; i < userIds.length; i++) {
    const userId = userIds[i];
    const agg = byUser.get(userId)!;
    const userData = userDocs[i].data();
    entries.push({
      userId,
      displayName: (userData?.displayName as string) ?? 'Unknown',
      slug: userData?.slug as string | undefined,
      isPublic: userData?.isPublic as boolean | undefined,
      avgScore: Math.round(agg.totalPct / agg.count),
      boardCount: agg.count,
    });
  }

  return entries.sort((a, b) => b.avgScore - a.avgScore);
}
