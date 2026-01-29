import { FieldValue } from 'firebase-admin/firestore';
import { db } from '../utils/firestore.js';
import type { Pick, TeamAbbreviation } from '@mockingboard/shared';

function picksRef(draftId: string) {
  return db.collection('drafts').doc(draftId).collection('picks');
}

export interface CreatePickInput {
  draftId: string;
  overall: number;
  round: number;
  pick: number;
  team: TeamAbbreviation;
  userId: string | null;
  playerId: string;
}

export async function createPick(input: CreatePickInput): Promise<Pick> {
  const { draftId, ...pickData } = input;

  const docRef = await picksRef(draftId).add({
    draftId,
    ...pickData,
    createdAt: FieldValue.serverTimestamp(),
  });

  const created = await docRef.get();
  return { id: created.id, ...created.data() } as Pick;
}

export async function getPicksByDraft(draftId: string): Promise<Pick[]> {
  const snapshot = await picksRef(draftId).orderBy('overall').get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Pick[];
}
