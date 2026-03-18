import {
  adminDb,
  sanitize,
  getCachedPublicBoards,
  getCachedPlayerMap,
} from './shared';
import type {
  Comment,
  Player,
  VideoBreakdown,
  PlayerPickStats,
} from '@mockingboard/shared';

export async function getComments(
  targetType: 'board' | 'report' | 'list',
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

// ---- Consensus Board ----

export interface ConsensusEntry {
  playerId: string;
  averageRank: number;
  boardCount: number;
  highestRank: number;
  lowestRank: number;
}

export interface ConsensusBoard {
  entries: ConsensusEntry[];
  totalBoards: number;
  totalScouts: number;
  lastUpdated: number | null;
}

const MIN_BOARDS_THRESHOLD = 3;

export async function getConsensusBoard(year: number): Promise<ConsensusBoard> {
  const allBoards = await getCachedPublicBoards();
  const yearBoards = allBoards.filter(
    (b) => b.year === year && b.rankings.length > 0,
  );

  const scoutIds = new Set(yearBoards.map((b) => b.userId));

  const playerRanks = new Map<string, number[]>();
  for (const board of yearBoards) {
    for (let i = 0; i < board.rankings.length; i++) {
      const playerId = board.rankings[i];
      const ranks = playerRanks.get(playerId);
      if (ranks) {
        ranks.push(i + 1);
      } else {
        playerRanks.set(playerId, [i + 1]);
      }
    }
  }

  const entries: ConsensusEntry[] = [];
  for (const [playerId, ranks] of playerRanks) {
    if (ranks.length < MIN_BOARDS_THRESHOLD) continue;
    const sum = ranks.reduce((a, b) => a + b, 0);
    entries.push({
      playerId,
      averageRank: sum / ranks.length,
      boardCount: ranks.length,
      highestRank: Math.min(...ranks),
      lowestRank: Math.max(...ranks),
    });
  }

  entries.sort(
    (a, b) =>
      a.averageRank - b.averageRank ||
      b.boardCount - a.boardCount ||
      a.highestRank - b.highestRank,
  );

  let lastUpdated: number | null = null;
  for (const board of yearBoards) {
    if (board.updatedAt?.seconds) {
      if (!lastUpdated || board.updatedAt.seconds > lastUpdated) {
        lastUpdated = board.updatedAt.seconds;
      }
    }
  }

  return {
    entries,
    totalBoards: yearBoards.length,
    totalScouts: scoutIds.size,
    lastUpdated,
  };
}

// ---- Trending Prospects ----

export interface TrendingProspect {
  player: Player;
  boardCount: number;
  averageRank: number;
  consensusRank: number;
  delta: number;
  highestRank: number;
  lowestRank: number;
}

export interface TrendingData {
  mostDiscussed: TrendingProspect[];
  risers: TrendingProspect[];
  fallers: TrendingProspect[];
  totalBoards: number;
  totalScouts: number;
}

const TRENDING_LIMIT = 10;

export async function getTrendingProspects(
  year: number,
): Promise<TrendingData> {
  const [consensus, playerMap] = await Promise.all([
    getConsensusBoard(year),
    getCachedPlayerMap(year),
  ]);

  const prospects: TrendingProspect[] = [];
  for (const entry of consensus.entries) {
    const player = playerMap.get(entry.playerId);
    if (!player) continue;
    prospects.push({
      player,
      boardCount: entry.boardCount,
      averageRank: entry.averageRank,
      consensusRank: player.consensusRank,
      delta: player.consensusRank - entry.averageRank,
      highestRank: entry.highestRank,
      lowestRank: entry.lowestRank,
    });
  }

  const mostDiscussed = [...prospects]
    .sort((a, b) => b.boardCount - a.boardCount)
    .slice(0, TRENDING_LIMIT);

  const risers = prospects
    .filter((p) => p.delta > 0)
    .sort((a, b) => b.delta - a.delta)
    .slice(0, TRENDING_LIMIT);

  const fallers = prospects
    .filter((p) => p.delta < 0)
    .sort((a, b) => a.delta - b.delta)
    .slice(0, TRENDING_LIMIT);

  return {
    mostDiscussed,
    risers,
    fallers,
    totalBoards: consensus.totalBoards,
    totalScouts: consensus.totalScouts,
  };
}

// ---- Hot Takes ----

export interface HotTake {
  player: Player;
  boardRank: number;
  consensusRank: number;
  delta: number; // consensusRank - boardRank (positive = scout is higher on player)
  boardId: string;
  boardName: string;
  authorName: string;
}

export interface GlobalHotTakes {
  takes: HotTake[];
  totalBoards: number;
}

const HOT_TAKE_THRESHOLD = 15;

export async function getBoardHotTakes(
  boardRankings: string[],
  year: number,
): Promise<HotTake[]> {
  const [consensus, playerMap] = await Promise.all([
    getConsensusBoard(year),
    getCachedPlayerMap(year),
  ]);

  const consensusLookup = new Map<string, number>();
  for (const entry of consensus.entries) {
    consensusLookup.set(entry.playerId, entry.averageRank);
  }

  const takes: HotTake[] = [];
  for (let i = 0; i < boardRankings.length; i++) {
    const playerId = boardRankings[i];
    const avgRank = consensusLookup.get(playerId);
    if (avgRank == null) continue;
    const player = playerMap.get(playerId);
    if (!player) continue;

    const boardRank = i + 1;
    const delta = avgRank - boardRank;
    if (Math.abs(delta) < HOT_TAKE_THRESHOLD) continue;

    takes.push({
      player,
      boardRank,
      consensusRank: Math.round(avgRank),
      delta,
      boardId: '',
      boardName: '',
      authorName: '',
    });
  }

  takes.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  return takes.slice(0, 5);
}

export async function getGlobalHotTakes(year: number): Promise<GlobalHotTakes> {
  const [allBoards, consensus, playerMap] = await Promise.all([
    getCachedPublicBoards(),
    getConsensusBoard(year),
    getCachedPlayerMap(year),
  ]);

  const yearBoards = allBoards.filter(
    (b) => b.year === year && b.rankings.length > 0,
  );

  const consensusLookup = new Map<string, number>();
  for (const entry of consensus.entries) {
    consensusLookup.set(entry.playerId, entry.averageRank);
  }

  const takes: HotTake[] = [];
  for (const board of yearBoards) {
    for (let i = 0; i < board.rankings.length; i++) {
      const playerId = board.rankings[i];
      const avgRank = consensusLookup.get(playerId);
      if (avgRank == null) continue;
      const player = playerMap.get(playerId);
      if (!player) continue;

      const boardRank = i + 1;
      const delta = avgRank - boardRank;
      if (Math.abs(delta) < HOT_TAKE_THRESHOLD) continue;

      takes.push({
        player,
        boardRank,
        consensusRank: Math.round(avgRank),
        delta,
        boardId: board.id,
        boardName: board.name,
        authorName: board.authorName ?? 'Anonymous',
      });
    }
  }

  takes.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  return { takes: takes.slice(0, 20), totalBoards: yearBoards.length };
}
