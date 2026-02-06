import 'server-only';

import {
  loadPlayerStats,
  loadRosters,
  loadDepthCharts,
} from '@nflverse/nflreadts';
import { adminDb } from './firebase-admin';
import { sanitize } from './sanitize';
import type {
  Player,
  DraftSlot,
  FuturePickSeed,
  ScoutProfile,
  Coach,
  KeyPlayerOverride,
  FrontOfficeStaff,
  Position,
} from '@mockingboard/shared';

// ---- TTLs ----

const PLAYER_TTL = 60 * 60 * 1000; // 1 hour
const DRAFT_ORDER_TTL = 24 * 60 * 60 * 1000; // 24 hours
const TEAMS_TTL = 24 * 60 * 60 * 1000; // 24 hours
const SCOUT_PROFILES_TTL = 24 * 60 * 60 * 1000; // 24 hours
const ROSTER_TTL = 6 * 60 * 60 * 1000; // 6 hours
const NFLVERSE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const SEASON_CONFIG_TTL = 5 * 60 * 1000; // 5 minutes

// ---- Internal cache structure ----

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

function isExpired<T>(entry: CacheEntry<T> | null | undefined): boolean {
  return !entry || Date.now() >= entry.expiresAt;
}

// ---- Player cache (keyed by year) ----

const playerCache = new Map<number, CacheEntry<Player[]>>();

/** Returns all players for a year, sorted by consensusRank. Cached for 1 hour. */
export async function getCachedPlayers(year: number): Promise<Player[]> {
  const entry = playerCache.get(year);
  if (!isExpired(entry)) return entry!.data;

  const snapshot = await adminDb
    .collection('players')
    .where('year', '==', year)
    .orderBy('consensusRank')
    .get();

  const players = sanitize(
    snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Player),
  );

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
  const entry = draftOrderCache.get(year);
  if (!isExpired(entry)) return entry!.data;

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
  const profiles = sanitize(
    snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as ScoutProfile),
  );

  scoutProfilesCache = {
    data: profiles,
    expiresAt: Date.now() + SCOUT_PROFILES_TTL,
  };
  return profiles;
}

// ---- NFL Roster cache (keyed by team abbreviation, from ESPN API) ----

export interface RosterPlayer {
  id: string;
  name: string;
  jersey: string;
  position: string;
  height: string;
  weight: string;
  age: number;
  experience: number;
  college: string;
  headshotUrl: string;
}

export interface TeamRoster {
  offense: RosterPlayer[];
  defense: RosterPlayer[];
  specialTeams: RosterPlayer[];
}

const ESPN_TEAM_IDS: Record<string, number> = {
  ATL: 1,
  BUF: 2,
  CHI: 3,
  CIN: 4,
  CLE: 5,
  DAL: 6,
  DEN: 7,
  DET: 8,
  GB: 9,
  TEN: 10,
  IND: 11,
  KC: 12,
  LV: 13,
  LAR: 14,
  MIA: 15,
  MIN: 16,
  NE: 17,
  NO: 18,
  NYG: 19,
  NYJ: 20,
  PHI: 21,
  ARI: 22,
  PIT: 23,
  LAC: 24,
  SF: 25,
  SEA: 26,
  TB: 27,
  WAS: 28,
  CAR: 29,
  JAX: 30,
  BAL: 33,
  HOU: 34,
};

const ESPN_POSITION_MAP: Record<string, string> = {
  G: 'OG',
  NT: 'DT',
  FB: 'RB',
};

function transformEspnRoster(json: Record<string, unknown>): TeamRoster {
  const groups = (json.athletes ?? []) as Array<{
    position: string;
    items: Array<Record<string, unknown>>;
  }>;
  const result: TeamRoster = { offense: [], defense: [], specialTeams: [] };

  const groupKeyMap: Record<string, keyof TeamRoster> = {
    offense: 'offense',
    defense: 'defense',
    specialTeam: 'specialTeams',
  };

  for (const group of groups) {
    const key = groupKeyMap[group.position];
    if (!key) continue;

    result[key] = (group.items ?? [])
      .filter(
        (p) => (p.status as { type?: string } | undefined)?.type === 'active',
      )
      .map((p) => {
        const raw =
          ((p.position as { abbreviation?: string }) ?? {}).abbreviation ?? '';
        const position = ESPN_POSITION_MAP[raw] ?? raw;
        return {
          id: (p.id as string) ?? '',
          name: (p.displayName as string) ?? '',
          jersey: (p.jersey as string) ?? '',
          position,
          height: (p.displayHeight as string) ?? '',
          weight: (p.displayWeight as string) ?? '',
          age: (p.age as number) ?? 0,
          experience: ((p.experience as { years?: number }) ?? {}).years ?? 0,
          college:
            ((p.college as { shortName?: string }) ?? {}).shortName ?? '',
          headshotUrl: ((p.headshot as { href?: string }) ?? {}).href ?? '',
        };
      });
  }

  return result;
}

const rosterCache = new Map<string, CacheEntry<TeamRoster>>();

/** Returns the current NFL roster for a team from ESPN. Cached for 6 hours. */
export async function getCachedRoster(
  team: string,
): Promise<TeamRoster | null> {
  const entry = rosterCache.get(team);
  if (!isExpired(entry)) return entry!.data;

  const espnId = ESPN_TEAM_IDS[team];
  if (!espnId) return null;

  try {
    const res = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/${espnId}/roster`,
    );
    if (!res.ok) return null;
    const json = (await res.json()) as Record<string, unknown>;
    const roster = transformEspnRoster(json);
    rosterCache.set(team, { data: roster, expiresAt: Date.now() + ROSTER_TTL });
    return roster;
  } catch {
    return null;
  }
}

// ---- nflverse data (keyed by season) ----

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const playerStatsCache = new Map<number, CacheEntry<any[]>>();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const nflRosterCache = new Map<number, CacheEntry<any[]>>();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const depthChartCache = new Map<number, CacheEntry<any[]>>();

/** Season-aggregated player stats from nflverse. Cached for 24 hours. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getCachedSeasonStats(season: number): Promise<any[]> {
  const entry = playerStatsCache.get(season);
  if (!isExpired(entry)) return entry!.data;

  try {
    const result = await loadPlayerStats(season, { summaryLevel: 'reg' });
    // loadPlayerStats returns Result<T, E> — unwrap the value
    const data = result.ok ? result.value : [];
    playerStatsCache.set(season, {
      data,
      expiresAt: Date.now() + NFLVERSE_TTL,
    });
    return data;
  } catch (err) {
    console.error(`Failed to load nflverse player stats for ${season}:`, err);
    return [];
  }
}

/** Roster/depth chart entries from nflverse. Cached for 24 hours. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getCachedNflRoster(season: number): Promise<any[]> {
  const entry = nflRosterCache.get(season);
  if (!isExpired(entry)) return entry!.data;

  try {
    const roster = await loadRosters(season);
    const data = Array.isArray(roster) ? roster : [];
    nflRosterCache.set(season, {
      data,
      expiresAt: Date.now() + NFLVERSE_TTL,
    });
    return data;
  } catch (err) {
    console.error(`Failed to load nflverse roster for ${season}:`, err);
    return [];
  }
}

/** Depth chart entries from nflverse. Cached for 24 hours. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getCachedDepthCharts(season: number): Promise<any[]> {
  const entry = depthChartCache.get(season);
  if (!isExpired(entry)) return entry!.data;

  try {
    const charts = await loadDepthCharts(season);
    const data = Array.isArray(charts) ? charts : [];
    depthChartCache.set(season, {
      data,
      expiresAt: Date.now() + NFLVERSE_TTL,
    });
    return data;
  } catch (err) {
    console.error(`Failed to load nflverse depth charts for ${season}:`, err);
    return [];
  }
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

/** Invalidate all caches. */
export function resetAllCaches() {
  // Singletons
  teamsCache = null;
  seasonConfigCache = null;
  scoutProfilesCache = null;
  announcementCache = null;
  draftNamesCache = null;
  tradeValuesCache = null;
  cpuConfigCache = null;
  // Maps
  playerCache.clear();
  draftOrderCache.clear();
  rosterCache.clear();
  playerStatsCache.clear();
  nflRosterCache.clear();
  depthChartCache.clear();
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
