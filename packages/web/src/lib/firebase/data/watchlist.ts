import { adminDb, sanitize } from './shared';
import type { WatchlistItem } from '@mockingboard/shared';

export async function getUserWatchlist(
  userId: string,
  year: number,
): Promise<WatchlistItem[]> {
  const snapshot = await adminDb
    .collection('watchlistItems')
    .where('userId', '==', userId)
    .where('year', '==', year)
    .orderBy('createdAt', 'desc')
    .limit(200)
    .get();

  return sanitize(
    snapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() }) as WatchlistItem,
    ),
  );
}

export async function getWatchedPlayerIds(
  userId: string,
  year: number,
): Promise<Set<string>> {
  const items = await getUserWatchlist(userId, year);
  return new Set(items.map((item) => item.playerId));
}

export async function isWatching(
  userId: string,
  playerId: string,
): Promise<boolean> {
  const docId = `${userId}_${playerId}`;
  const doc = await adminDb.collection('watchlistItems').doc(docId).get();
  return doc.exists;
}
