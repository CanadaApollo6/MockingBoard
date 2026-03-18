import 'server-only';

import { Timestamp } from 'firebase-admin/firestore';
import { adminDb } from './firebase-admin';
import { getCachedPlayerMap, getCachedScoutProfiles } from '../cache';
import { sanitize, hydrateDoc, hydrateDocs } from './sanitize';
import { AppError } from '../validate';
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
  DraftResultPick,
  Position,
  TeamAbbreviation,
  PlayerPickStats,
  FirestoreTimestamp,
  Comment,
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

const USER_STATS_TTL = 5 * 60 * 1000; // 5 minutes
const userStatsCache = new Map<
  string,
  { data: { totalDrafts: number; totalPicks: number }; expiresAt: number }
>();

export async function getUserStats(
  userId: string,
  discordId?: string,
): Promise<{ totalDrafts: number; totalPicks: number }> {
  const cached = userStatsCache.get(userId);
  if (cached && Date.now() < cached.expiresAt) return cached.data;

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

  const stats = { totalDrafts, totalPicks };
  userStatsCache.set(userId, {
    data: stats,
    expiresAt: Date.now() + USER_STATS_TTL,
  });
  return stats;
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
    .orderBy('stats.accuracyScore', 'desc')
    .limit(limit + 5)
    .get();

  return sanitize(
    hydrateDocs<User>(snapshot)
      .filter((u) => !u.isGuest && (u.stats?.accuracyScore ?? 0) > 0)
      .slice(0, limit),
  );
}

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  slug?: string;
  isPublic?: boolean;
  avgScore: number;
  draftCount: number;
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

// ---- Drafting Identity ----

export interface DraftingIdentity {
  topPositions: { position: Position; count: number }[];
  favoriteTeam: TeamAbbreviation | null;
  totalDrafts: number;
  totalPicks: number;
}

export async function getUserDraftingIdentity(
  userId: string,
  discordId?: string,
): Promise<DraftingIdentity | null> {
  const ids = [userId, ...(discordId ? [discordId] : [])];

  const draftsSnap = await adminDb
    .collection('drafts')
    .where('participantIds', 'array-contains-any', ids)
    .where('status', '==', 'complete')
    .orderBy('createdAt', 'desc')
    .limit(100)
    .select()
    .get();

  if (draftsSnap.empty) return null;

  const positionCounts = new Map<Position, number>();
  const teamCounts = new Map<TeamAbbreviation, number>();
  let totalPicks = 0;

  await Promise.all(
    draftsSnap.docs.map(async (draftDoc) => {
      const picksSnap = await draftDoc.ref
        .collection('picks')
        .where('userId', '==', userId)
        .get();

      for (const pickDoc of picksSnap.docs) {
        const pick = pickDoc.data() as Pick;
        totalPicks++;

        if (pick.team) {
          teamCounts.set(pick.team, (teamCounts.get(pick.team) ?? 0) + 1);
        }
      }

      // Batch-resolve positions from player cache
      const playerIds = picksSnap.docs.map((d) => (d.data() as Pick).playerId);
      if (playerIds.length === 0) return;

      // Use the first available year's player map (picks span multiple years but positions are stable)
      const playerMap = await getCachedPlayerMap(2026);
      for (const pid of playerIds) {
        const player = playerMap.get(pid);
        if (player) {
          positionCounts.set(
            player.position,
            (positionCounts.get(player.position) ?? 0) + 1,
          );
        }
      }
    }),
  );

  if (totalPicks === 0) return null;

  const topPositions = [...positionCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([position, count]) => ({ position, count }));

  let favoriteTeam: TeamAbbreviation | null = null;
  let maxTeamCount = 0;
  for (const [team, count] of teamCounts) {
    if (count > maxTeamCount) {
      maxTeamCount = count;
      favoriteTeam = team;
    }
  }

  return {
    topPositions,
    favoriteTeam,
    totalDrafts: draftsSnap.size,
    totalPicks,
  };
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

export async function getPlayerPickStats(
  playerId: string,
): Promise<PlayerPickStats | null> {
  const doc = await adminDb.collection('playerPickStats').doc(playerId).get();
  if (!doc.exists) return null;
  return sanitize({ id: doc.id, ...doc.data() } as unknown as PlayerPickStats);
}

export async function getComments(
  targetType: 'board' | 'report',
  targetId: string,
  limit = 50,
): Promise<Comment[]> {
  const snapshot = await adminDb
    .collection('comments')
    .where('targetId', '==', targetId)
    .where('targetType', '==', targetType)
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();

  return sanitize(
    snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Comment),
  );
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

export async function getPopularReports(limit = 6): Promise<ScoutingReport[]> {
  const snapshot = await adminDb
    .collection('scoutingReports')
    .orderBy('likeCount', 'desc')
    .limit(limit)
    .get();

  return sanitize(hydrateDocs<ScoutingReport>(snapshot));
}
