import {
  Timestamp,
  adminDb,
  sanitize,
  hydrateDoc,
  hydrateDocs,
  AppError,
  getCachedPlayerMap,
} from './shared';
import { BoundedCache } from '../../cache/common';
import type {
  Draft,
  Pick,
  Player,
  Trade,
  Position,
  TeamAbbreviation,
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

// ---- User Stats ----

const USER_STATS_TTL = 5 * 60 * 1000; // 5 minutes
const userStatsCache = new BoundedCache<
  string,
  { totalDrafts: number; totalPicks: number }
>(1000, USER_STATS_TTL);

export async function getUserStats(
  userId: string,
  discordId?: string,
): Promise<{ totalDrafts: number; totalPicks: number }> {
  const cached = userStatsCache.get(userId);
  if (cached) return cached;

  const ids = [userId, ...(discordId ? [discordId] : [])];

  const draftsSnap = await adminDb
    .collection('drafts')
    .where('participantIds', 'array-contains-any', ids)
    .select('status')
    .limit(200)
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
  userStatsCache.set(userId, stats);
  return stats;
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
