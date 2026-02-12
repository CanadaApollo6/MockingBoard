import { adminDb } from '@/lib/firebase/firebase-admin';

/** TTL cache so repeated checks in the same request don't re-read Firestore. */
const cache = new Map<string, { value: boolean; expiry: number }>();
const TTL_MS = 60_000; // 1 minute

export async function isAdmin(uid: string): Promise<boolean> {
  const cached = cache.get(uid);
  if (cached && Date.now() < cached.expiry) return cached.value;

  const snap = await adminDb.doc(`users/${uid}`).get();
  const value = snap.exists && snap.data()?.isAdmin === true;
  cache.set(uid, { value, expiry: Date.now() + TTL_MS });
  return value;
}
