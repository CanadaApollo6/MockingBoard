import 'server-only';

import { adminDb } from './firebase-admin';
import type { Draft, Pick, Player, Trade } from '@mockingboard/shared';

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
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Draft);
}

export async function getDraft(draftId: string): Promise<Draft | null> {
  const doc = await adminDb.collection('drafts').doc(draftId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() } as Draft;
}

export async function getDraftPicks(draftId: string): Promise<Pick[]> {
  const snapshot = await adminDb
    .collection('drafts')
    .doc(draftId)
    .collection('picks')
    .orderBy('overall')
    .get();

  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Pick);
}

export async function getPlayerMap(year: number): Promise<Map<string, Player>> {
  const snapshot = await adminDb
    .collection('players')
    .where('year', '==', year)
    .get();

  const map = new Map<string, Player>();
  for (const doc of snapshot.docs) {
    map.set(doc.id, { id: doc.id, ...doc.data() } as Player);
  }
  return map;
}

export async function getDraftTrades(draftId: string): Promise<Trade[]> {
  const snapshot = await adminDb
    .collection('trades')
    .where('draftId', '==', draftId)
    .where('status', '==', 'accepted')
    .get();

  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Trade);
}

export async function getUserDrafts(discordId: string): Promise<Draft[]> {
  // Firestore can't query map values, so fetch recent drafts and filter
  const allDrafts = await getDrafts({ limit: 100 });
  return allDrafts.filter((d) =>
    Object.values(d.participants).includes(discordId),
  );
}
