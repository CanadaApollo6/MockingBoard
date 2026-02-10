import type {
  Player,
  DraftSlot,
  FuturePickSeed,
  ScoutProfile,
  Coach,
  KeyPlayerOverride,
  FrontOfficeStaff,
  Position,
  User,
  BigBoard,
} from '@mockingboard/shared';
import {
  type CacheEntry,
  isExpired,
  getOrExpire,
  adminDb,
  sanitize,
  hydrateDocs,
  PLAYER_TTL,
  DRAFT_ORDER_TTL,
  TEAMS_TTL,
  SCOUT_PROFILES_TTL,
  SEARCH_TTL,
  SEASON_CONFIG_TTL,
} from './common';

// ---- Player cache (keyed by year) ----

const playerCache = new Map<number, CacheEntry<Player[]>>();

/** Returns all players for a year, sorted by consensusRank. Cached for 1 hour. */
export async function getCachedPlayers(year: number): Promise<Player[]> {
  const cached = getOrExpire(playerCache, year);
  if (cached) return cached;

  const snapshot = await adminDb
    .collection('players')
    .where('year', '==', year)
    .orderBy('consensusRank')
    .get();

  const players = sanitize(hydrateDocs<Player>(snapshot));

  playerCache.set(year, { data: players, expiresAt: Date.now() + PLAYER_TTL });
  return players;
}

/** Returns a Map<id, Player> for a year. Derived from the cached player list. */
export async function getCachedPlayerMap(
  year: number,
): Promise<Map<string, Player>> {
  const players = await getCachedPlayers(year);
  const map = new Map<string, Player>();
  for (const p of players) map.set(p.id, p);
  return map;
}

// ---- Draft order cache (keyed by year) ----

const draftOrderCache = new Map<number, CacheEntry<DraftSlot[]>>();

/** Returns raw draft order slots for a year. Cached for 24 hours. */
export async function getCachedDraftOrderSlots(
  year: number,
): Promise<DraftSlot[]> {
  const cached = getOrExpire(draftOrderCache, year);
  if (cached) return cached;

  const doc = await adminDb.collection('draftOrders').doc(`${year}`).get();
  const data = doc.data();
  if (!data?.slots) {
    throw new Error(`No draft order found for year ${year}`);
  }

  const slots = data.slots as DraftSlot[];
  draftOrderCache.set(year, {
    data: slots,
    expiresAt: Date.now() + DRAFT_ORDER_TTL,
  });
  return slots;
}

// ---- Teams cache (singleton — all teams) ----

export interface CachedTeamDoc {
  id: string;
  futurePicks?: FuturePickSeed[];
  keyPlayers?: KeyPlayerOverride[];
  coachingStaff?: Coach[];
  frontOffice?: FrontOfficeStaff[];
  needs?: Position[];
}

let teamsCache: CacheEntry<CachedTeamDoc[]> | null = null;

/** Returns all team docs. Cached for 24 hours. */
export async function getCachedTeamDocs(): Promise<CachedTeamDoc[]> {
  if (!isExpired(teamsCache)) return teamsCache!.data;

  const snapshot = await adminDb.collection('teams').get();
  const docs: CachedTeamDoc[] = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      futurePicks: data.futurePicks as FuturePickSeed[] | undefined,
      keyPlayers: data.keyPlayers as KeyPlayerOverride[] | undefined,
      coachingStaff: data.coachingStaff as Coach[] | undefined,
      frontOffice: data.frontOffice as FrontOfficeStaff[] | undefined,
      needs: data.needs as Position[] | undefined,
    };
  });

  teamsCache = { data: docs, expiresAt: Date.now() + TEAMS_TTL };
  return docs;
}

/** Invalidate teams cache (call after admin edits). */
export function resetTeamsCache() {
  teamsCache = null;
}

// ---- Scout profiles cache (singleton) ----

let scoutProfilesCache: CacheEntry<ScoutProfile[]> | null = null;

/** Returns all scout profiles. Cached for 24 hours. */
export async function getCachedScoutProfiles(): Promise<ScoutProfile[]> {
  if (!isExpired(scoutProfilesCache)) return scoutProfilesCache!.data;

  const snapshot = await adminDb.collection('scoutProfiles').get();
  const profiles = sanitize(hydrateDocs<ScoutProfile>(snapshot));

  scoutProfilesCache = {
    data: profiles,
    expiresAt: Date.now() + SCOUT_PROFILES_TTL,
  };
  return profiles;
}

// ---- Season config cache (singleton) ----

export interface SeasonConfig {
  draftYear: number;
  statsYear: number;
}

const DEFAULT_SEASON_CONFIG: SeasonConfig = {
  draftYear: 2026,
  statsYear: 2025,
};

let seasonConfigCache: CacheEntry<SeasonConfig> | null = null;

/** Returns the season config from Firestore. Falls back to defaults if not set. Cached for 5 minutes. */
export async function getCachedSeasonConfig(): Promise<SeasonConfig> {
  if (!isExpired(seasonConfigCache)) return seasonConfigCache!.data;

  try {
    const doc = await adminDb.collection('config').doc('season').get();
    const data = doc.exists
      ? (doc.data() as SeasonConfig)
      : DEFAULT_SEASON_CONFIG;
    const config = {
      draftYear: data.draftYear ?? DEFAULT_SEASON_CONFIG.draftYear,
      statsYear: data.statsYear ?? DEFAULT_SEASON_CONFIG.statsYear,
    };
    seasonConfigCache = {
      data: config,
      expiresAt: Date.now() + SEASON_CONFIG_TTL,
    };
    return config;
  } catch (err) {
    console.error('Failed to load season config:', err);
    return DEFAULT_SEASON_CONFIG;
  }
}

/** Invalidate season config cache (call after admin edits). */
export function resetSeasonConfigCache() {
  seasonConfigCache = null;
}

/** Invalidate draft order cache. */
export function resetDraftOrderCache() {
  draftOrderCache.clear();
}

/** Invalidate player cache. */
export function resetPlayerCache() {
  playerCache.clear();
}

// ---- Public users cache (for search) ----

let publicUsersCache: CacheEntry<User[]> | null = null;

/** Returns all public users. Cached for 5 minutes. */
export async function getCachedPublicUsers(): Promise<User[]> {
  if (!isExpired(publicUsersCache)) return publicUsersCache!.data;

  const snapshot = await adminDb
    .collection('users')
    .where('isPublic', '==', true)
    .orderBy('updatedAt', 'desc')
    .limit(1000)
    .get();

  const users = sanitize(hydrateDocs<User>(snapshot));

  publicUsersCache = { data: users, expiresAt: Date.now() + SEARCH_TTL };
  return users;
}

// ---- Public boards cache (for search) ----

let publicBoardsCache: CacheEntry<BigBoard[]> | null = null;

/** Returns all public boards. Cached for 5 minutes. */
export async function getCachedPublicBoards(): Promise<BigBoard[]> {
  if (!isExpired(publicBoardsCache)) return publicBoardsCache!.data;

  const snapshot = await adminDb
    .collection('bigBoards')
    .where('visibility', '==', 'public')
    .orderBy('updatedAt', 'desc')
    .limit(1000)
    .get();

  const boards = sanitize(hydrateDocs<BigBoard>(snapshot));

  publicBoardsCache = { data: boards, expiresAt: Date.now() + SEARCH_TTL };
  return boards;
}

// ---- Draft names cache (singleton) ----

export interface DraftNamesOverride {
  adjectives: string[];
  nouns: string[];
}

let draftNamesCache: CacheEntry<DraftNamesOverride | null> | null = null;

/** Returns admin-configured draft name words, or null to use shared defaults. Cached for 5 minutes. */
export async function getCachedDraftNames(): Promise<DraftNamesOverride | null> {
  if (!isExpired(draftNamesCache)) return draftNamesCache!.data;

  try {
    const doc = await adminDb.collection('config').doc('draftNames').get();
    const data = doc.exists ? (doc.data() as DraftNamesOverride) : null;
    const names =
      data && data.adjectives?.length > 0 && data.nouns?.length > 0
        ? data
        : null;
    draftNamesCache = {
      data: names,
      expiresAt: Date.now() + SEASON_CONFIG_TTL,
    };
    return names;
  } catch (err) {
    console.error('Failed to load draft names:', err);
    return null;
  }
}

// ---- Trade values cache (singleton) ----

export interface TradeValuesOverride {
  values?: number[];
  round1Premium?: number;
}

let tradeValuesCache: CacheEntry<TradeValuesOverride | null> | null = null;

/** Returns admin trade value overrides, or null to use shared defaults. Cached for 5 minutes. */
export async function getCachedTradeValues(): Promise<TradeValuesOverride | null> {
  if (!isExpired(tradeValuesCache)) return tradeValuesCache!.data;

  try {
    const doc = await adminDb.collection('config').doc('tradeValues').get();
    const data = doc.exists ? (doc.data() as TradeValuesOverride) : null;
    const result = data?.values?.length ? data : null;
    tradeValuesCache = {
      data: result,
      expiresAt: Date.now() + SEASON_CONFIG_TTL,
    };
    return result;
  } catch (err) {
    console.error('Failed to load trade values:', err);
    return null;
  }
}

// ---- CPU config cache (singleton) ----

export interface CpuConfigOverride {
  needMultipliers?: number[];
  wildThresholds?: number[];
  maxNeedMults?: number[];
  cpuPickWeights?: { top: number; mid: number };
}

let cpuConfigCache: CacheEntry<CpuConfigOverride | null> | null = null;

/** Returns admin CPU config overrides, or null to use shared defaults. Cached for 5 minutes. */
export async function getCachedCpuConfig(): Promise<CpuConfigOverride | null> {
  if (!isExpired(cpuConfigCache)) return cpuConfigCache!.data;

  try {
    const doc = await adminDb.collection('config').doc('cpu').get();
    const data = doc.exists ? (doc.data() as CpuConfigOverride) : null;
    cpuConfigCache = {
      data: data ?? null,
      expiresAt: Date.now() + SEASON_CONFIG_TTL,
    };
    return data ?? null;
  } catch (err) {
    console.error('Failed to load CPU config:', err);
    return null;
  }
}

// ---- Announcement cache (singleton) ----

export interface Announcement {
  text: string;
  active: boolean;
  variant: 'info' | 'warning' | 'success';
}

let announcementCache: CacheEntry<Announcement | null> | null = null;

/** Returns the current announcement. Cached for 5 minutes. */
export async function getCachedAnnouncement(): Promise<Announcement | null> {
  if (!isExpired(announcementCache)) return announcementCache!.data;

  try {
    const doc = await adminDb.collection('config').doc('announcement').get();
    const data = doc.exists ? (doc.data() as Announcement) : null;
    const announcement = data?.active ? data : null;
    announcementCache = {
      data: announcement,
      expiresAt: Date.now() + SEASON_CONFIG_TTL,
    };
    return announcement;
  } catch (err) {
    console.error('Failed to load announcement:', err);
    return null;
  }
}

// ---- Bulk reset ----

/** Invalidate all Firestore-backed caches. */
export function resetFirestoreCaches() {
  teamsCache = null;
  seasonConfigCache = null;
  scoutProfilesCache = null;
  announcementCache = null;
  draftNamesCache = null;
  tradeValuesCache = null;
  cpuConfigCache = null;
  publicUsersCache = null;
  publicBoardsCache = null;
  playerCache.clear();
  draftOrderCache.clear();
}
