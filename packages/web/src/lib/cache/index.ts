export * from './firestore';
export * from './external';
export type { CacheEntry } from './common';

import { resetFirestoreCaches } from './firestore';
import { resetExternalCaches } from './external';

/** Invalidate all caches. */
export function resetAllCaches() {
  resetFirestoreCaches();
  resetExternalCaches();
}
