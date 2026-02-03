import 'server-only';

import { adminDb } from './firebase-admin';
import { getCachedPlayerMap } from './cache';
import { sanitize } from './sanitize';
import type { Draft, Pick, Player, Trade } from '@mockingboard/shared';

export async function getDrafts(options?: {
  status?: Draft['status'];
  limit?: number;
}): Promise<Draft[]> {
  let query: FirebaseFirestore.Query = adminDb
    .collection('drafts')
    .orderBy('createdAt', 'desc');

  if (options?.status) query = query.where('status', '==', options.status);
  query = query.limit(options?.limit ?? 50);

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
  return getCachedPlayerMap(year);
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

export async function getPublicLobbies(): Promise<Draft[]> {
  const snapshot = await adminDb
    .collection('drafts')
    .where('visibility', '==', 'public')
    .where('status', '==', 'lobby')
    .orderBy('createdAt', 'desc')
    .limit(20)
    .get();

  return sanitize(
    snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Draft),
  );
}

export async function getUserDrafts(
  userId: string,
  discordId?: string,
): Promise<Draft[]> {
  const ids = [userId, ...(discordId ? [discordId] : [])];

  const [byParticipant, byCreator] = await Promise.all([
    adminDb
      .collection('drafts')
      .where('participantIds', 'array-contains-any', ids)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get(),
    adminDb
      .collection('drafts')
      .where('createdBy', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get(),
  ]);

  const seen = new Set<string>();
  const drafts: Draft[] = [];

  for (const doc of [...byParticipant.docs, ...byCreator.docs]) {
    if (seen.has(doc.id)) continue;
    seen.add(doc.id);
    drafts.push({ id: doc.id, ...doc.data() } as Draft);
  }

  drafts.sort((a, b) => {
    const aTime = a.createdAt?.seconds ?? 0;
    const bTime = b.createdAt?.seconds ?? 0;
    return bTime - aTime;
  });

  return sanitize(drafts.slice(0, 50));
}
