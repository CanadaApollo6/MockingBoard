import 'server-only';

import type { RookieSlotData } from '@mockingboard/shared';
import { type CacheEntry, getOrExpire, adminDb } from './common';

export const ROOKIE_SLOTS_TTL = 24 * 60 * 60 * 1000; // 24 hours

const rookieSlotsCache = new Map<string, CacheEntry<RookieSlotData>>();

/** Rookie slot data from Firestore, cached for 24 hours. */
export async function getCachedRookieSlots(): Promise<RookieSlotData | null> {
  const cached = getOrExpire(rookieSlotsCache, 'current');
  if (cached) return cached;

  const doc = await adminDb.collection('rookieSlotValues').doc('current').get();
  if (!doc.exists) return null;

  const data = doc.data() as RookieSlotData;
  rookieSlotsCache.set('current', {
    data,
    expiresAt: Date.now() + ROOKIE_SLOTS_TTL,
  });
  return data;
}

/** Invalidate rookie slot cache (call after admin import). */
export function resetRookieSlotsCache(): void {
  rookieSlotsCache.clear();
}
