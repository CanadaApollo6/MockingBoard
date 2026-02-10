import {
  loadPlayerStats,
  loadRosters,
  loadDepthCharts,
} from '@nflverse/nflreadts';
import {
  type CacheEntry,
  getOrExpire,
  ROSTER_TTL,
  NFLVERSE_TTL,
} from './common';

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
  const cached = getOrExpire(rosterCache, team);
  if (cached) return cached;

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
  const cached = getOrExpire(playerStatsCache, season);
  if (cached) return cached;

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
  const cached = getOrExpire(nflRosterCache, season);
  if (cached) return cached;

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
  const cached = getOrExpire(depthChartCache, season);
  if (cached) return cached;

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

// ---- Bulk reset ----

/** Invalidate all external API caches. */
export function resetExternalCaches() {
  rosterCache.clear();
  playerStatsCache.clear();
  nflRosterCache.clear();
  depthChartCache.clear();
}
