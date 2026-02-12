import { teams } from '@mockingboard/shared';
import {
  type CacheEntry,
  isExpired,
  getOrExpire,
  ROSTER_TTL,
  SCHEDULE_TTL,
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
  status: string;
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

const OFFENSE_POSITIONS = new Set([
  'QB',
  'RB',
  'FB',
  'WR',
  'TE',
  'OT',
  'OG',
  'C',
  'G',
  'T',
]);
const SPECIAL_TEAMS_POSITIONS = new Set(['K', 'P', 'LS']);

function mapPlayer(
  p: Record<string, unknown>,
  statusOverride?: string,
): RosterPlayer {
  const raw =
    ((p.position as { abbreviation?: string }) ?? {}).abbreviation ?? '';
  const position = ESPN_POSITION_MAP[raw] ?? raw;
  const statusName =
    statusOverride ?? ((p.status as { name?: string }) ?? {}).name ?? 'Active';
  return {
    id: (p.id as string) ?? '',
    name: (p.displayName as string) ?? '',
    jersey: (p.jersey as string) ?? '',
    position,
    height: (p.displayHeight as string) ?? '',
    weight: (p.displayWeight as string) ?? '',
    age: (p.age as number) ?? 0,
    experience: ((p.experience as { years?: number }) ?? {}).years ?? 0,
    college: ((p.college as { shortName?: string }) ?? {}).shortName ?? '',
    headshotUrl: ((p.headshot as { href?: string }) ?? {}).href ?? '',
    status: statusName,
  };
}

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
    if (key) {
      result[key] = (group.items ?? []).map((p) => mapPlayer(p));
      continue;
    }

    // IR / injured / suspended — sort into positional groups by their position
    if (
      group.position === 'injuredReserveOrOut' ||
      group.position === 'suspended'
    ) {
      const statusLabel = group.position === 'suspended' ? 'Suspended' : 'IR';
      for (const p of group.items ?? []) {
        const player = mapPlayer(p, statusLabel);
        if (SPECIAL_TEAMS_POSITIONS.has(player.position)) {
          result.specialTeams.push(player);
        } else if (OFFENSE_POSITIONS.has(player.position)) {
          result.offense.push(player);
        } else {
          result.defense.push(player);
        }
      }
    }
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

// ---- NFL Schedule cache (keyed by team abbreviation, from ESPN API) ----

export interface GameResult {
  week: number;
  weekLabel: string;
  opponent: string;
  opponentName: string;
  isHome: boolean;
  isWin: boolean;
  isTie: boolean;
  teamScore: number;
  opponentScore: number;
  record: string;
}

export interface TeamSchedule {
  games: GameResult[];
}

interface EspnCompetitor {
  id: string;
  homeAway: string;
  winner: boolean;
  score: { value: number; displayValue: string };
  team: { abbreviation: string; displayName: string };
  record?: Array<{ displayValue: string }>;
}

interface EspnEvent {
  week: { number: number; text: string };
  competitions: Array<{
    competitors: EspnCompetitor[];
    status: { type: { completed: boolean } };
  }>;
}

function transformEspnSchedule(
  json: Record<string, unknown>,
  espnId: number,
): GameResult[] {
  const events = (json.events ?? []) as EspnEvent[];
  const results: GameResult[] = [];

  for (const event of events) {
    const comp = event.competitions?.[0];
    if (!comp?.status?.type?.completed) continue;

    const us = comp.competitors.find((c) => c.id === String(espnId));
    const them = comp.competitors.find((c) => c.id !== String(espnId));
    if (!us || !them) continue;

    const teamScore = us.score?.value ?? 0;
    const opponentScore = them.score?.value ?? 0;

    results.push({
      week: event.week.number,
      weekLabel: event.week.text,
      opponent: them.team.abbreviation,
      opponentName: them.team.displayName,
      isHome: us.homeAway === 'home',
      isWin: us.winner === true,
      isTie: teamScore === opponentScore,
      teamScore,
      opponentScore,
      record: us.record?.[0]?.displayValue ?? '',
    });
  }

  return results;
}

const scheduleCache = new Map<string, CacheEntry<TeamSchedule>>();

/** Returns the current season's game results for a team from ESPN. Cached for 6 hours. */
export async function getCachedSchedule(
  team: string,
): Promise<TeamSchedule | null> {
  const cached = getOrExpire(scheduleCache, team);
  if (cached) return cached;

  const espnId = ESPN_TEAM_IDS[team];
  if (!espnId) return null;

  try {
    const base = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/${espnId}/schedule`;
    const [regRes, postRes] = await Promise.all([
      fetch(`${base}?seasontype=2`),
      fetch(`${base}?seasontype=3`),
    ]);

    const games: GameResult[] = [];

    if (regRes.ok) {
      const json = (await regRes.json()) as Record<string, unknown>;
      games.push(...transformEspnSchedule(json, espnId));
    }
    if (postRes.ok) {
      const json = (await postRes.json()) as Record<string, unknown>;
      games.push(...transformEspnSchedule(json, espnId));
    }

    const schedule: TeamSchedule = { games };
    scheduleCache.set(team, {
      data: schedule,
      expiresAt: Date.now() + SCHEDULE_TTL,
    });
    return schedule;
  } catch {
    return null;
  }
}

// ---- Aggregated roster cache (all 32 teams for search / browse) ----

export interface RosterPlayerWithTeam extends RosterPlayer {
  teamAbbreviation: string;
  teamName: string;
}

let allRostersCache: CacheEntry<RosterPlayerWithTeam[]> | null = null;

/** Returns all active NFL players across all 32 teams. Cached for 6 hours. */
export async function getCachedAllRosters(): Promise<RosterPlayerWithTeam[]> {
  if (allRostersCache && !isExpired(allRostersCache))
    return allRostersCache.data;

  const teamAbbreviations = Object.keys(ESPN_TEAM_IDS);
  const rosters = await Promise.all(
    teamAbbreviations.map(async (abbr) => {
      const roster = await getCachedRoster(abbr);
      if (!roster) return [];
      const teamInfo = teams.find((t) => t.id === abbr);
      const teamName = teamInfo?.name ?? abbr;
      const all = [
        ...roster.offense,
        ...roster.defense,
        ...roster.specialTeams,
      ];
      return all.map((p) => ({ ...p, teamAbbreviation: abbr, teamName }));
    }),
  );

  const flat = rosters.flat();
  allRostersCache = { data: flat, expiresAt: Date.now() + ROSTER_TTL };
  return flat;
}

// ---- Bulk reset ----

/** Invalidate all external API caches. */
export function resetExternalCaches() {
  rosterCache.clear();
  scheduleCache.clear();
  allRostersCache = null;
}
