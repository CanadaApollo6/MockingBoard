import 'server-only';

// Re-export shared dependencies so domain files import from './common' only
export { adminDb } from '../firebase-admin';
export { sanitize, hydrateDoc, hydrateDocs } from '../sanitize';

// ---- TTLs ----

export const PLAYER_TTL = 60 * 60 * 1000; // 1 hour
export const DRAFT_ORDER_TTL = 24 * 60 * 60 * 1000; // 24 hours
export const TEAMS_TTL = 24 * 60 * 60 * 1000; // 24 hours
export const SCOUT_PROFILES_TTL = 24 * 60 * 60 * 1000; // 24 hours
export const ROSTER_TTL = 6 * 60 * 60 * 1000; // 6 hours
export const NFLVERSE_TTL = 24 * 60 * 60 * 1000; // 24 hours
export const SEARCH_TTL = 5 * 60 * 1000; // 5 minutes
export const SEASON_CONFIG_TTL = 5 * 60 * 1000; // 5 minutes

// ---- Internal cache structure ----

export interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export function isExpired<T>(entry: CacheEntry<T> | null | undefined): boolean {
  return !entry || Date.now() >= entry.expiresAt;
}

/** Get from a Map cache, lazily evicting expired entries. */
export function getOrExpire<K, V>(
  map: Map<K, CacheEntry<V>>,
  key: K,
): V | undefined {
  const entry = map.get(key);
  if (!entry) return undefined;
  if (Date.now() >= entry.expiresAt) {
    map.delete(key);
    return undefined;
  }
  return entry.data;
}
