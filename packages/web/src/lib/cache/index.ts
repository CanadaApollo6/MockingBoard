export * from './firestore';
export * from './external';
export * from './espn-player';
export * from './contracts';
export * from './rookie-slots';
export type { CacheEntry } from './common';

import { resetFirestoreCaches } from './firestore';
import { resetExternalCaches } from './external';
import { resetEspnPlayerCaches } from './espn-player';
import { resetContractsCache } from './contracts';
import { resetRookieSlotsCache } from './rookie-slots';

/** Invalidate all caches. */
export function resetAllCaches() {
  resetFirestoreCaches();
  resetExternalCaches();
  resetEspnPlayerCaches();
  resetContractsCache();
  resetRookieSlotsCache();
}
