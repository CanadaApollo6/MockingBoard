import {
  Timestamp,
  adminDb,
  sanitize,
  hydrateDoc,
  hydrateDocs,
  getCachedScoutProfiles,
  getCachedPlayerMap,
} from './shared';
import type { User, ScoutProfile, Player } from '@mockingboard/shared';

export async function getUserBySlug(slug: string): Promise<User | null> {
  const snapshot = await adminDb
    .collection('users')
    .where('slug', '==', slug)
    .where('isPublic', '==', true)
    .limit(1)
    .get();

  if (snapshot.empty) return null;
  return sanitize(hydrateDoc<User>(snapshot.docs[0]));
}

export async function getPublicUsers(options?: {
  limit?: number;
  afterSeconds?: number;
}): Promise<{ users: User[]; hasMore: boolean }> {
  const limit = options?.limit ?? 20;
  let query: FirebaseFirestore.Query = adminDb
    .collection('users')
    .where('isPublic', '==', true)
    .orderBy('updatedAt', 'desc');

  if (options?.afterSeconds) {
    query = query.startAfter(new Timestamp(options.afterSeconds, 0));
  }

  query = query.limit(limit + 1);

  const snapshot = await query.get();
  const users = sanitize(hydrateDocs<User>(snapshot));

  const hasMore = users.length > limit;
  return { users: users.slice(0, limit), hasMore };
}

export async function getFollowCounts(
  userId: string,
): Promise<{ followers: number; following: number }> {
  const [followersSnap, followingSnap] = await Promise.all([
    adminDb
      .collection('follows')
      .where('followeeId', '==', userId)
      .count()
      .get(),
    adminDb
      .collection('follows')
      .where('followerId', '==', userId)
      .count()
      .get(),
  ]);

  return {
    followers: followersSnap.data().count,
    following: followingSnap.data().count,
  };
}

export async function getLeaderboard(limit = 50): Promise<User[]> {
  const snapshot = await adminDb
    .collection('users')
    .orderBy('stats.accuracyScore', 'desc')
    .limit(limit + 10)
    .get();

  return sanitize(
    hydrateDocs<User>(snapshot)
      .filter((u) => !u.isGuest && (u.stats?.accuracyScore ?? 0) > 0)
      .slice(0, limit),
  );
}

// ---- Scout Profiles ----

export async function getScoutProfiles(): Promise<ScoutProfile[]> {
  return getCachedScoutProfiles();
}

export async function getScoutProfileBySlug(
  slug: string,
): Promise<ScoutProfile | null> {
  const profiles = await getCachedScoutProfiles();
  return profiles.find((p) => p.slug === slug) ?? null;
}

export async function getScoutContributedPlayers(
  profileId: string,
  year: number,
): Promise<Player[]> {
  const playerMap = await getCachedPlayerMap(year);
  return [...playerMap.values()].filter(
    (p) => p.dataProviders && profileId in p.dataProviders,
  );
}
