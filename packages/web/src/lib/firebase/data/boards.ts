import {
  Timestamp,
  adminDb,
  sanitize,
  hydrateDoc,
  hydrateDocs,
} from './shared';
import type {
  BigBoard,
  BoardSnapshot,
  FirestoreTimestamp,
} from '@mockingboard/shared';

export async function getUserBoards(userId: string): Promise<BigBoard[]> {
  const snapshot = await adminDb
    .collection('bigBoards')
    .where('userId', '==', userId)
    .orderBy('updatedAt', 'desc')
    .get();

  return sanitize(hydrateDocs<BigBoard>(snapshot));
}

export async function getBigBoard(boardId: string): Promise<BigBoard | null> {
  const doc = await adminDb.collection('bigBoards').doc(boardId).get();
  if (!doc.exists) return null;
  return sanitize(hydrateDoc<BigBoard>(doc));
}

export async function getUserBoardForYear(
  userId: string,
  year: number,
): Promise<BigBoard | null> {
  const snapshot = await adminDb
    .collection('bigBoards')
    .where('userId', '==', userId)
    .where('year', '==', year)
    .orderBy('updatedAt', 'desc')
    .limit(1)
    .get();

  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return sanitize(hydrateDoc<BigBoard>(doc));
}

export async function getBoardSnapshots(
  boardId: string,
): Promise<BoardSnapshot[]> {
  const snap = await adminDb
    .collection('bigBoards')
    .doc(boardId)
    .collection('snapshots')
    .orderBy('createdAt', 'desc')
    .get();

  return sanitize(hydrateDocs<BoardSnapshot>(snap));
}

export async function getBoardSnapshot(
  boardId: string,
  snapshotId: string,
): Promise<BoardSnapshot | null> {
  const doc = await adminDb
    .collection('bigBoards')
    .doc(boardId)
    .collection('snapshots')
    .doc(snapshotId)
    .get();

  if (!doc.exists) return null;
  return sanitize(hydrateDoc<BoardSnapshot>(doc));
}

export async function getPublicBoards(options?: {
  limit?: number;
  afterSeconds?: number;
}): Promise<{ boards: BigBoard[]; hasMore: boolean }> {
  const limit = options?.limit ?? 20;
  let query: FirebaseFirestore.Query = adminDb
    .collection('bigBoards')
    .where('visibility', '==', 'public')
    .orderBy('updatedAt', 'desc');

  if (options?.afterSeconds) {
    query = query.startAfter(new Timestamp(options.afterSeconds, 0));
  }

  query = query.limit(limit + 1);

  const snapshot = await query.get();
  const boards = sanitize(hydrateDocs<BigBoard>(snapshot));

  const hasMore = boards.length > limit;
  return { boards: boards.slice(0, limit), hasMore };
}

export async function getBigBoardBySlug(
  slug: string,
): Promise<BigBoard | null> {
  const snapshot = await adminDb
    .collection('bigBoards')
    .where('slug', '==', slug)
    .where('visibility', '==', 'public')
    .limit(1)
    .get();

  if (snapshot.empty) return null;
  return sanitize(hydrateDoc<BigBoard>(snapshot.docs[0]));
}

export async function getUserPublicBoards(userId: string): Promise<BigBoard[]> {
  const snapshot = await adminDb
    .collection('bigBoards')
    .where('userId', '==', userId)
    .where('visibility', '==', 'public')
    .orderBy('updatedAt', 'desc')
    .limit(10)
    .get();

  return sanitize(hydrateDocs<BigBoard>(snapshot));
}

export async function getBoardsByIds(ids: string[]): Promise<BigBoard[]> {
  if (ids.length === 0) return [];
  const docs = await Promise.all(
    ids.map((id) => adminDb.collection('bigBoards').doc(id).get()),
  );
  return sanitize(
    docs
      .filter((d) => d.exists && d.data()?.visibility === 'public')
      .map((d) => hydrateDoc<BigBoard>(d)),
  );
}

export async function getUserLikedBoards(
  userId: string,
  limit = 10,
): Promise<{ boardId: string; createdAt: FirestoreTimestamp }[]> {
  const snapshot = await adminDb
    .collection('boardLikes')
    .where('userId', '==', userId)
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      boardId: data.boardId as string,
      createdAt: data.createdAt as FirestoreTimestamp,
    };
  });
}

export async function getUserBookmarkedBoards(
  userId: string,
  limit = 20,
): Promise<{ targetId: string; createdAt: FirestoreTimestamp }[]> {
  const snapshot = await adminDb
    .collection('bookmarks')
    .where('userId', '==', userId)
    .where('targetType', '==', 'board')
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();

  return snapshot.docs.map((d) => ({
    targetId: d.data().targetId as string,
    createdAt: d.data().createdAt as FirestoreTimestamp,
  }));
}

export async function getTrendingBoards(limit = 8): Promise<BigBoard[]> {
  const snapshot = await adminDb
    .collection('bigBoards')
    .where('visibility', '==', 'public')
    .orderBy('likeCount', 'desc')
    .limit(limit)
    .get();

  return sanitize(hydrateDocs<BigBoard>(snapshot));
}
