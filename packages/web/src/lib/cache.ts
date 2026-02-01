import 'server-only';

import { adminDb } from './firebase-admin';
import type { Player, DraftSlot, FuturePickSeed } from '@mockingboard/shared';

// ---- TTLs ----

const PLAYER_TTL = 60 * 60 * 1000; // 1 hour
const DRAFT_ORDER_TTL = 24 * 60 * 60 * 1000; // 24 hours
const TEAMS_TTL = 24 * 60 * 60 * 1000; // 24 hours

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

  const players = snapshot.docs.map(
    (doc) => ({ id: doc.id, ...doc.data() }) as Player,
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
}

let teamsCache: CacheEntry<CachedTeamDoc[]> | null = null;

/** Returns all team docs (id + futurePicks). Cached for 24 hours. */
export async function getCachedTeamDocs(): Promise<CachedTeamDoc[]> {
  if (!isExpired(teamsCache)) return teamsCache!.data;

  const snapshot = await adminDb.collection('teams').get();
  const docs: CachedTeamDoc[] = snapshot.docs.map((doc) => ({
    id: doc.id,
    futurePicks: doc.data().futurePicks as FuturePickSeed[] | undefined,
  }));

  teamsCache = { data: docs, expiresAt: Date.now() + TEAMS_TTL };
  return docs;
}
