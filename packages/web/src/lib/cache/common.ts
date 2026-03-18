import 'server-only';

// Re-export shared dependencies so domain files import from './common' only
export { adminDb } from '../firebase/firebase-admin';
export { sanitize, hydrateDoc, hydrateDocs } from '../firebase/sanitize';

// ---- TTLs ----

export const PLAYER_TTL = 60 * 60 * 1000; // 1 hour
export const DRAFT_ORDER_TTL = 24 * 60 * 60 * 1000; // 24 hours
export const TEAMS_TTL = 24 * 60 * 60 * 1000; // 24 hours
export const SCOUT_PROFILES_TTL = 24 * 60 * 60 * 1000; // 24 hours
export const ROSTER_TTL = 6 * 60 * 60 * 1000; // 6 hours
export const SCHEDULE_TTL = 6 * 60 * 60 * 1000; // 6 hours
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

/**
 * A size-bounded Map cache with TTL. When the cache exceeds maxSize,
 * the oldest entries (by insertion order) are evicted.
 */
export class BoundedCache<K, V> {
  private map = new Map<K, CacheEntry<V>>();

  constructor(
    private maxSize: number,
    private ttlMs: number,
  ) {}

  get(key: K): V | undefined {
    const entry = this.map.get(key);
    if (!entry) return undefined;
    if (Date.now() >= entry.expiresAt) {
      this.map.delete(key);
      return undefined;
    }
    return entry.data;
  }

  set(key: K, data: V): void {
    // Delete first to reset insertion order
    this.map.delete(key);
    this.map.set(key, { data, expiresAt: Date.now() + this.ttlMs });
    // Evict oldest entries if over capacity
    if (this.map.size > this.maxSize) {
      const excess = this.map.size - this.maxSize;
      const keys = this.map.keys();
      for (let i = 0; i < excess; i++) {
        const oldest = keys.next().value;
        if (oldest !== undefined) this.map.delete(oldest);
      }
    }
  }

  clear(): void {
    this.map.clear();
  }

  get size(): number {
    return this.map.size;
  }
}
