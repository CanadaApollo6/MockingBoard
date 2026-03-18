import {
  Timestamp,
  adminDb,
  sanitize,
  hydrateDoc,
  hydrateDocs,
} from './shared';
import type { UserList } from '@mockingboard/shared';

export async function getPublicLists(options?: {
  limit?: number;
  afterSeconds?: number;
}): Promise<{ lists: UserList[]; hasMore: boolean }> {
  const limit = options?.limit ?? 20;
  let query: FirebaseFirestore.Query = adminDb
    .collection('lists')
    .where('visibility', '==', 'public')
    .orderBy('updatedAt', 'desc');

  if (options?.afterSeconds) {
    query = query.startAfter(new Timestamp(options.afterSeconds, 0));
  }

  query = query.limit(limit + 1);

  const snapshot = await query.get();
  const lists = sanitize(hydrateDocs<UserList>(snapshot));

  const hasMore = lists.length > limit;
  return { lists: lists.slice(0, limit), hasMore };
}

export async function getListBySlug(slug: string): Promise<UserList | null> {
  // Try slug first
  const snapshot = await adminDb
    .collection('lists')
    .where('slug', '==', slug)
    .where('visibility', '==', 'public')
    .limit(1)
    .get();

  if (!snapshot.empty) return sanitize(hydrateDoc<UserList>(snapshot.docs[0]));

  // Fallback to doc ID
  const doc = await adminDb.collection('lists').doc(slug).get();
  if (!doc.exists || doc.data()?.visibility !== 'public') return null;
  return sanitize(hydrateDoc<UserList>(doc));
}

export async function getList(listId: string): Promise<UserList | null> {
  const doc = await adminDb.collection('lists').doc(listId).get();
  if (!doc.exists) return null;
  return sanitize(hydrateDoc<UserList>(doc));
}

export async function getUserPublicLists(userId: string): Promise<UserList[]> {
  const snapshot = await adminDb
    .collection('lists')
    .where('userId', '==', userId)
    .where('visibility', '==', 'public')
    .orderBy('updatedAt', 'desc')
    .limit(20)
    .get();

  return sanitize(hydrateDocs<UserList>(snapshot));
}

export async function getUserLists(userId: string): Promise<UserList[]> {
  const snapshot = await adminDb
    .collection('lists')
    .where('userId', '==', userId)
    .orderBy('updatedAt', 'desc')
    .limit(50)
    .get();

  return sanitize(hydrateDocs<UserList>(snapshot));
}

export async function getPopularLists(limit = 4): Promise<UserList[]> {
  const snapshot = await adminDb
    .collection('lists')
    .where('visibility', '==', 'public')
    .orderBy('likeCount', 'desc')
    .limit(limit)
    .get();

  return sanitize(hydrateDocs<UserList>(snapshot));
}
