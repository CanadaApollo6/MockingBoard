import 'server-only';

import { adminDb } from './firebase-admin';
import type { Draft, Pick, Player, Trade } from '@mockingboard/shared';

/** Strip Firestore class instances (Timestamp, etc.) to plain serializable objects. */
function sanitize<T>(data: T): T {
  return JSON.parse(JSON.stringify(data));
}

export async function getDrafts(options?: {
  status?: Draft['status'];
  limit?: number;
}): Promise<Draft[]> {
  let query: FirebaseFirestore.Query = adminDb
    .collection('drafts')
    .orderBy('createdAt', 'desc');

  if (options?.status) query = query.where('status', '==', options.status);
  if (options?.limit) query = query.limit(options.limit);

  const snapshot = await query.get();
  return sanitize(
    snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Draft),
  );
}

export async function getDraft(draftId: string): Promise<Draft | null> {
  const doc = await adminDb.collection('drafts').doc(draftId).get();
  if (!doc.exists) return null;
  return sanitize({ id: doc.id, ...doc.data() } as Draft);
}

export async function getDraftPicks(draftId: string): Promise<Pick[]> {
  const snapshot = await adminDb
    .collection('drafts')
    .doc(draftId)
    .collection('picks')
    .orderBy('overall')
    .get();

  return sanitize(
    snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Pick),
  );
}

export async function getPlayerMap(year: number): Promise<Map<string, Player>> {
  const snapshot = await adminDb
    .collection('players')
    .where('year', '==', year)
    .get();

  const map = new Map<string, Player>();
  for (const doc of snapshot.docs) {
    map.set(doc.id, sanitize({ id: doc.id, ...doc.data() } as Player));
  }
  return map;
}

export async function getDraftTrades(draftId: string): Promise<Trade[]> {
  const snapshot = await adminDb
    .collection('trades')
    .where('draftId', '==', draftId)
    .where('status', '==', 'accepted')
    .get();

  return sanitize(
    snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Trade),
  );
}

export async function getUserDrafts(
  userId: string,
  discordId?: string,
): Promise<Draft[]> {
  // Firestore can't query map values, so fetch recent drafts and filter
  const allDrafts = await getDrafts({ limit: 100 });
  return allDrafts.filter((d) => {
    const keys = Object.keys(d.participants);
    const values = Object.values(d.participants);
    if (keys.includes(userId) || values.includes(userId)) return true;
    if (discordId && (keys.includes(discordId) || values.includes(discordId)))
      return true;
    return false;
  });
}
