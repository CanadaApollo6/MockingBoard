import 'server-only';

import { type CacheEntry, getOrExpire, PLAYER_TTL } from './common';

// ---- Types ----

export interface EspnPlayerBio {
  id: string;
  displayName: string;
  firstName: string;
  lastName: string;
  jersey: string;
  position: string;
  teamAbbreviation: string;
  teamDisplayName: string;
  college: string;
  displayDraft: string | null;
  displayDOB: string;
  displayBirthPlace: string;
  displayHeight: string;
  displayWeight: string;
  age: number;
  displayExperience: string;
  debutYear: number | null;
  status: string;
}

export interface EspnStatCategory {
  name: string;
  displayName: string;
  labels: string[];
  names: string[];
  displayNames: string[];
  seasons: { displayName: string; stats: string[] }[];
  totals: string[];
}

export interface EspnGameLogEntry {
  eventId: string;
  week: number;
  atVs: string;
  gameDate: string;
  score: string;
  gameResult: string;
  opponentName: string;
  opponentAbbreviation: string;
}

export interface EspnGameLogStatGroup {
  displayName: string;
  labels: string[];
  names: string[];
  displayNames: string[];
  events: { eventId: string; stats: string[] }[];
}

export interface EspnGameLog {
  seasonLabel: string;
  events: Map<string, EspnGameLogEntry>;
  statGroups: EspnGameLogStatGroup[];
  availableSeasons: string[];
}

export interface EspnPlayerData {
  bio: EspnPlayerBio;
  statCategories: EspnStatCategory[];
  gameLog: EspnGameLog | null;
}

// ---- Transform functions ----

const ESPN_STATUS_MAP: Record<string, string> = {
  'Day-To-Day': 'IR',
  Suspension: 'Suspended',
};

function transformBio(json: Record<string, unknown>): EspnPlayerBio | null {
  const athlete = json.athlete as Record<string, unknown> | undefined;
  if (!athlete) return null;

  const position = athlete.position as Record<string, unknown> | undefined;
  const team = athlete.team as Record<string, unknown> | undefined;
  const college = athlete.college as Record<string, unknown> | undefined;

  const rawStatus = String(
    (athlete.status as Record<string, unknown> | undefined)?.name ?? 'Unknown',
  );

  return {
    id: String(athlete.id ?? ''),
    displayName: String(athlete.displayName ?? ''),
    firstName: String(athlete.firstName ?? ''),
    lastName: String(athlete.lastName ?? ''),
    jersey: String(athlete.jersey ?? athlete.displayJersey ?? ''),
    position: String(position?.abbreviation ?? ''),
    teamAbbreviation: String(team?.abbreviation ?? ''),
    teamDisplayName: String(team?.displayName ?? ''),
    college: String(college?.shortName ?? college?.name ?? ''),
    displayDraft: athlete.displayDraft ? String(athlete.displayDraft) : null,
    displayDOB: String(athlete.displayDOB ?? ''),
    displayBirthPlace: String(athlete.displayBirthPlace ?? ''),
    displayHeight: String(athlete.displayHeight ?? ''),
    displayWeight: String(athlete.displayWeight ?? ''),
    age: Number(athlete.age ?? 0),
    displayExperience: String(athlete.displayExperience ?? ''),
    debutYear: athlete.debutYear ? Number(athlete.debutYear) : null,
    status: ESPN_STATUS_MAP[rawStatus] ?? rawStatus,
  };
}

function transformStats(json: Record<string, unknown>): EspnStatCategory[] {
  const categories = json.categories as
    | Array<Record<string, unknown>>
    | undefined;
  if (!categories) return [];

  return categories.map((cat) => {
    const statistics = (cat.statistics ?? []) as Array<Record<string, unknown>>;

    return {
      name: String(cat.name ?? ''),
      displayName: String(cat.displayName ?? ''),
      labels: (cat.labels ?? []) as string[],
      names: (cat.names ?? []) as string[],
      displayNames: (cat.displayNames ?? []) as string[],
      seasons: statistics.map((row) => ({
        displayName: String(
          (row.season as Record<string, unknown> | undefined)?.displayName ??
            row.displayName ??
            '',
        ),
        stats: (row.stats ?? []) as string[],
      })),
      totals: (cat.totals ?? []) as string[],
    };
  });
}

function transformGameLog(json: Record<string, unknown>): EspnGameLog | null {
  const rawEvents = json.events as
    | Record<string, Record<string, unknown>>
    | undefined;
  const seasonTypes = json.seasonTypes as
    | Array<Record<string, unknown>>
    | undefined;
  const filters = json.filters as Array<Record<string, unknown>> | undefined;

  const events = new Map<string, EspnGameLogEntry>();
  if (rawEvents) {
    for (const [, ev] of Object.entries(rawEvents)) {
      const opponent = ev.opponent as Record<string, unknown> | undefined;
      events.set(String(ev.id), {
        eventId: String(ev.id ?? ''),
        week: Number(ev.week ?? 0),
        atVs: String(ev.atVs ?? ''),
        gameDate: String(ev.gameDate ?? ''),
        score: String(ev.score ?? ''),
        gameResult: String(ev.gameResult ?? ''),
        opponentName: String(
          opponent?.displayName ?? opponent?.abbreviation ?? '',
        ),
        opponentAbbreviation: String(opponent?.abbreviation ?? ''),
      });
    }
  }

  const statGroups: EspnGameLogStatGroup[] = [];
  if (seasonTypes) {
    for (const st of seasonTypes) {
      const cats = (st.categories ?? []) as Array<Record<string, unknown>>;
      for (const cat of cats) {
        const catEvents = (cat.events ?? []) as Array<Record<string, unknown>>;
        statGroups.push({
          displayName: String(cat.displayName ?? st.displayName ?? ''),
          labels: (json.labels ?? []) as string[],
          names: (json.names ?? []) as string[],
          displayNames: (json.displayNames ?? []) as string[],
          events: catEvents.map((e) => ({
            eventId: String(e.eventId ?? ''),
            stats: (e.stats ?? []) as string[],
          })),
        });
      }
    }
  }

  const seasonFilter = filters?.find((f) => String(f.name) === 'season');
  const availableSeasons = (
    (seasonFilter?.options ?? []) as Array<Record<string, unknown>>
  ).map((o) => String(o.value));

  const displayName = String(json.displayName ?? '');

  return {
    seasonLabel: displayName,
    events,
    statGroups,
    availableSeasons,
  };
}

// ---- Caches ----

const bioCache = new Map<string, CacheEntry<EspnPlayerBio>>();
const statsCache = new Map<string, CacheEntry<EspnStatCategory[]>>();
const gameLogCache = new Map<string, CacheEntry<EspnGameLog>>();

const ESPN_ATHLETE_BASE =
  'https://site.web.api.espn.com/apis/common/v3/sports/football/nfl/athletes';

export async function getCachedEspnPlayerBio(
  espnId: string,
): Promise<EspnPlayerBio | null> {
  const cached = getOrExpire(bioCache, espnId);
  if (cached) return cached;

  try {
    const res = await fetch(`${ESPN_ATHLETE_BASE}/${espnId}`);
    if (!res.ok) return null;
    const json = (await res.json()) as Record<string, unknown>;
    const bio = transformBio(json);
    if (!bio) return null;
    bioCache.set(espnId, { data: bio, expiresAt: Date.now() + PLAYER_TTL });
    return bio;
  } catch {
    return null;
  }
}

export async function getCachedEspnPlayerStats(
  espnId: string,
): Promise<EspnStatCategory[]> {
  const cached = getOrExpire(statsCache, espnId);
  if (cached) return cached;

  try {
    const res = await fetch(`${ESPN_ATHLETE_BASE}/${espnId}/stats`);
    if (!res.ok) return [];
    const json = (await res.json()) as Record<string, unknown>;
    const cats = transformStats(json);
    statsCache.set(espnId, {
      data: cats,
      expiresAt: Date.now() + PLAYER_TTL,
    });
    return cats;
  } catch {
    return [];
  }
}

export async function getCachedEspnGameLog(
  espnId: string,
  season?: string,
): Promise<EspnGameLog | null> {
  const cacheKey = season ? `${espnId}:${season}` : espnId;
  const cached = getOrExpire(gameLogCache, cacheKey);
  if (cached) return cached;

  try {
    const url = season
      ? `${ESPN_ATHLETE_BASE}/${espnId}/gamelog?season=${season}`
      : `${ESPN_ATHLETE_BASE}/${espnId}/gamelog`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = (await res.json()) as Record<string, unknown>;
    const gl = transformGameLog(json);
    if (!gl) return null;
    gameLogCache.set(cacheKey, {
      data: gl,
      expiresAt: Date.now() + PLAYER_TTL,
    });
    return gl;
  } catch {
    return null;
  }
}

/** Fetch bio + career stats + current season gamelog in parallel. */
export async function getCachedEspnPlayerData(
  espnId: string,
): Promise<EspnPlayerData | null> {
  const [bio, statCategories, gameLog] = await Promise.all([
    getCachedEspnPlayerBio(espnId),
    getCachedEspnPlayerStats(espnId),
    getCachedEspnGameLog(espnId),
  ]);

  if (!bio) return null;

  return { bio, statCategories, gameLog };
}

export function resetEspnPlayerCaches() {
  bioCache.clear();
  statsCache.clear();
  gameLogCache.clear();
}
