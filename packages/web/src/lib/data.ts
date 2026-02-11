import 'server-only';

import { Timestamp } from 'firebase-admin/firestore';
import { adminDb } from './firebase-admin';
import { getCachedPlayerMap, getCachedScoutProfiles } from './cache';
import { sanitize, hydrateDoc, hydrateDocs } from './sanitize';
import { AppError } from './validate';
import type {
  Draft,
  Pick,
  Player,
  Trade,
  ScoutProfile,
  BigBoard,
  BoardSnapshot,
  ScoutingReport,
  User,
  VideoBreakdown,
} from '@mockingboard/shared';

export async function getDrafts(options?: {
  status?: Draft['status'];
  limit?: number;
}): Promise<Draft[]> {
  let query: FirebaseFirestore.Query = adminDb
    .collection('drafts')
    .orderBy('createdAt', 'desc');

  if (options?.status) query = query.where('status', '==', options.status);
  query = query.limit(options?.limit ?? 50);

  const snapshot = await query.get();
  return sanitize(hydrateDocs<Draft>(snapshot));
}

export async function getDraft(draftId: string): Promise<Draft | null> {
  const doc = await adminDb.collection('drafts').doc(draftId).get();
  if (!doc.exists) return null;
  return sanitize(hydrateDoc<Draft>(doc));
}

export async function getDraftOrFail(draftId: string): Promise<Draft> {
  const draft = await getDraft(draftId);
  if (!draft) throw new AppError('Draft not found', 404);
  return draft;
}

export async function getDraftPicks(draftId: string): Promise<Pick[]> {
  const snapshot = await adminDb
    .collection('drafts')
    .doc(draftId)
    .collection('picks')
    .orderBy('overall')
    .get();

  return sanitize(hydrateDocs<Pick>(snapshot));
}

export async function getPlayerMap(year: number): Promise<Map<string, Player>> {
  return getCachedPlayerMap(year);
}

export async function getDraftTrades(draftId: string): Promise<Trade[]> {
  const snapshot = await adminDb
    .collection('trades')
    .where('draftId', '==', draftId)
    .where('status', '==', 'accepted')
    .get();

  return sanitize(hydrateDocs<Trade>(snapshot));
}

export async function getPublicLobbies(): Promise<Draft[]> {
  const snapshot = await adminDb
    .collection('drafts')
    .where('visibility', '==', 'public')
    .where('status', '==', 'lobby')
    .orderBy('createdAt', 'desc')
    .limit(20)
    .get();

  return sanitize(hydrateDocs<Draft>(snapshot));
}

export async function getDraftsPaginated(options: {
  limit: number;
  afterSeconds?: number;
  excludePrivate?: boolean;
}): Promise<{ drafts: Draft[]; hasMore: boolean }> {
  let query: FirebaseFirestore.Query = adminDb
    .collection('drafts')
    .orderBy('createdAt', 'desc');

  if (options.afterSeconds) {
    query = query.startAfter(new Timestamp(options.afterSeconds, 0));
  }

  // Over-fetch to compensate for JS-side privacy filtering
  const fetchLimit = options.excludePrivate
    ? options.limit + 10
    : options.limit;
  query = query.limit(fetchLimit + 1);

  const snapshot = await query.get();
  let drafts = sanitize(hydrateDocs<Draft>(snapshot));

  if (options.excludePrivate) {
    drafts = drafts.filter((d) => d.visibility !== 'private');
  }

  const hasMore = drafts.length > options.limit;
  return { drafts: drafts.slice(0, options.limit), hasMore };
}

export async function getUserDraftsPaginated(
  userId: string,
  discordId?: string,
  options?: { limit?: number; afterSeconds?: number },
): Promise<{ drafts: Draft[]; hasMore: boolean }> {
  const limit = options?.limit ?? 20;
  const ids = [userId, ...(discordId ? [discordId] : [])];

  let participantQuery: FirebaseFirestore.Query = adminDb
    .collection('drafts')
    .where('participantIds', 'array-contains-any', ids)
    .orderBy('createdAt', 'desc');

  let creatorQuery: FirebaseFirestore.Query = adminDb
    .collection('drafts')
    .where('createdBy', '==', userId)
    .orderBy('createdAt', 'desc');

  if (options?.afterSeconds) {
    const cursor = new Timestamp(options.afterSeconds, 0);
    participantQuery = participantQuery.startAfter(cursor);
    creatorQuery = creatorQuery.startAfter(cursor);
  }

  const fetchLimit = limit + 1;
  participantQuery = participantQuery.limit(fetchLimit);
  creatorQuery = creatorQuery.limit(fetchLimit);

  const [byParticipant, byCreator] = await Promise.all([
    participantQuery.get(),
    creatorQuery.get(),
  ]);

  const seen = new Set<string>();
  const drafts: Draft[] = [];

  for (const doc of [...byParticipant.docs, ...byCreator.docs]) {
    if (seen.has(doc.id)) continue;
    seen.add(doc.id);
    drafts.push({ id: doc.id, ...doc.data() } as Draft);
  }

  drafts.sort((a, b) => {
    const aTime = a.createdAt?.seconds ?? 0;
    const bTime = b.createdAt?.seconds ?? 0;
    return bTime - aTime;
  });

  const sanitized = sanitize(drafts);
  const hasMore = sanitized.length > limit;
  return { drafts: sanitized.slice(0, limit), hasMore };
}

// ---- User Stats ----

export async function getUserStats(
  userId: string,
  discordId?: string,
): Promise<{ totalDrafts: number; totalPicks: number }> {
  const ids = [userId, ...(discordId ? [discordId] : [])];

  const draftsSnap = await adminDb
    .collection('drafts')
    .where('participantIds', 'array-contains-any', ids)
    .select('status')
    .get();

  const completedDrafts = draftsSnap.docs.filter(
    (d) => d.data().status === 'complete',
  );
  const totalDrafts = completedDrafts.length;

  const pickCounts = await Promise.all(
    completedDrafts.map((d) =>
      d.ref
        .collection('picks')
        .where('userId', '==', userId)
        .select()
        .get()
        .then((snap) => snap.size),
    ),
  );
  const totalPicks = pickCounts.reduce((sum, c) => sum + c, 0);

  return { totalDrafts, totalPicks };
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

// ---- Big Boards ----

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

// ---- Scouting Reports ----

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

// ---- User Profiles ----

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

// ---- Dashboard ----

export async function getRecentCompletedDraft(): Promise<Draft | null> {
  const snapshot = await adminDb
    .collection('drafts')
    .where('status', '==', 'complete')
    .orderBy('updatedAt', 'desc')
    .limit(5)
    .get();

  const drafts = hydrateDocs<Draft>(snapshot).filter(
    (d) => d.visibility !== 'private',
  );

  if (drafts.length === 0) return null;
  return sanitize(drafts[0]);
}

export async function getTopDrafters(limit = 5): Promise<User[]> {
  const snapshot = await adminDb
    .collection('users')
    .orderBy('stats.totalDrafts', 'desc')
    .limit(limit + 5)
    .get();

  return sanitize(
    hydrateDocs<User>(snapshot)
      .filter((u) => !u.isGuest && (u.stats?.totalDrafts ?? 0) > 0)
      .slice(0, limit),
  );
}

// ---- Video Breakdowns ----

export async function getPlayerVideos(
  playerId: string,
): Promise<VideoBreakdown[]> {
  const snapshot = await adminDb
    .collection('videoBreakdowns')
    .where('playerId', '==', playerId)
    .orderBy('createdAt', 'desc')
    .limit(30)
    .get();

  return sanitize(
    snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        platform: data.platform ?? 'youtube',
        url: data.url ?? data.youtubeUrl ?? '',
        embedId: data.embedId ?? data.youtubeVideoId ?? '',
      } as VideoBreakdown;
    }),
  );
}
