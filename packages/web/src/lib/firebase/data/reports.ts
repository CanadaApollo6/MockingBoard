import { adminDb, sanitize, hydrateDoc, hydrateDocs } from './shared';
import type { ScoutingReport, FirestoreTimestamp } from '@mockingboard/shared';

export async function getPlayerReports(
  playerId: string,
): Promise<ScoutingReport[]> {
  const snapshot = await adminDb
    .collection('scoutingReports')
    .where('playerId', '==', playerId)
    .orderBy('createdAt', 'desc')
    .limit(50)
    .get();

  return sanitize(hydrateDocs<ScoutingReport>(snapshot));
}

export async function getUserReports(
  authorId: string,
): Promise<ScoutingReport[]> {
  const snapshot = await adminDb
    .collection('scoutingReports')
    .where('authorId', '==', authorId)
    .orderBy('createdAt', 'desc')
    .limit(20)
    .get();

  return sanitize(hydrateDocs<ScoutingReport>(snapshot));
}

export async function getReportsByIds(
  ids: string[],
): Promise<ScoutingReport[]> {
  if (ids.length === 0) return [];
  const docs = await Promise.all(
    ids.map((id) => adminDb.collection('scoutingReports').doc(id).get()),
  );
  return sanitize(
    docs.filter((d) => d.exists).map((d) => hydrateDoc<ScoutingReport>(d)),
  );
}

export async function getUserLikedReports(
  userId: string,
  limit = 10,
): Promise<{ reportId: string; createdAt: FirestoreTimestamp }[]> {
  const snapshot = await adminDb
    .collection('reportLikes')
    .where('userId', '==', userId)
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      reportId: data.reportId as string,
      createdAt: data.createdAt as FirestoreTimestamp,
    };
  });
}

export async function getUserBookmarkedReports(
  userId: string,
  limit = 20,
): Promise<{ targetId: string; createdAt: FirestoreTimestamp }[]> {
  const snapshot = await adminDb
    .collection('bookmarks')
    .where('userId', '==', userId)
    .where('targetType', '==', 'report')
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();

  return snapshot.docs.map((d) => ({
    targetId: d.data().targetId as string,
    createdAt: d.data().createdAt as FirestoreTimestamp,
  }));
}

export async function getPopularReports(limit = 6): Promise<ScoutingReport[]> {
  const snapshot = await adminDb
    .collection('scoutingReports')
    .orderBy('likeCount', 'desc')
    .limit(limit)
    .get();

  return sanitize(hydrateDocs<ScoutingReport>(snapshot));
}
