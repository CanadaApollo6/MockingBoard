import { adminDb } from '@/lib/firebase/firebase-admin';
import { BoundedCache } from '@/lib/cache/common';

/** TTL cache so repeated checks in the same request don't re-read Firestore. */
const TTL_MS = 60_000; // 1 minute
const cache = new BoundedCache<string, boolean>(100, TTL_MS);

export async function isAdmin(uid: string): Promise<boolean> {
  const cached = cache.get(uid);
  if (cached !== undefined) return cached;

  const snap = await adminDb.doc(`users/${uid}`).get();
  const value = snap.exists && snap.data()?.isAdmin === true;
  cache.set(uid, value);
  return value;
}
