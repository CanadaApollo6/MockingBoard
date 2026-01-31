import { FieldValue } from 'firebase-admin/firestore';
import { db } from '../utils/firestore.js';
import type {
  Draft,
  DraftFormat,
  DraftPlatform,
  DraftSlot,
  FutureDraftPick,
  FuturePickSeed,
  TeamAbbreviation,
  TeamAssignmentMode,
  CpuSpeed,
  Pick,
} from '@mockingboard/shared';
import {
  teams,
  filterAndSortPickOrder,
  buildFuturePicksFromSeeds,
} from '@mockingboard/shared';

// Re-export shared pure functions for existing bot consumers
export { getPickController } from '@mockingboard/shared';

export interface CreateDraftInput {
  createdBy: string;
  config: {
    rounds: number;
    secondsPerPick: number;
    format: DraftFormat;
    year: number;
    teamAssignmentMode: TeamAssignmentMode;
    cpuSpeed: CpuSpeed;
    tradesEnabled: boolean;
  };
  platform: DraftPlatform;
  discord?: {
    guildId: string;
    channelId: string;
    threadId: string;
  };
  teamAssignments: Record<TeamAbbreviation, string | null>;
  pickOrder: DraftSlot[];
  futurePicks?: FutureDraftPick[];
}

export async function createDraft(input: CreateDraftInput): Promise<Draft> {
  const now = FieldValue.serverTimestamp();
  const draftData = {
    ...input,
    status: 'lobby' as const,
    currentPick: 1,
    currentRound: 1,
    participants: {} as Record<string, string>,
    pickedPlayerIds: [] as string[],
    createdAt: now,
    updatedAt: now,
  };

  const docRef = await db.collection('drafts').add(draftData);
  const created = await docRef.get();
  return { id: created.id, ...created.data() } as Draft;
}

export async function getDraft(draftId: string): Promise<Draft | null> {
  const doc = await db.collection('drafts').doc(draftId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() } as Draft;
}

export async function updateDraft(
  draftId: string,
  updates: Partial<Omit<Draft, 'id' | 'createdAt' | 'createdBy'>>,
): Promise<void> {
  await db
    .collection('drafts')
    .doc(draftId)
    .update({
      ...updates,
      updatedAt: FieldValue.serverTimestamp(),
    });
}

export async function getActiveDraftInThread(
  threadId: string,
): Promise<Draft | null> {
  const snapshot = await db
    .collection('drafts')
    .where('discord.threadId', '==', threadId)
    .where('status', 'in', ['lobby', 'active', 'paused'])
    .limit(1)
    .get();

  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() } as Draft;
}

export async function buildPickOrder(
  rounds: number,
  year: number,
): Promise<DraftSlot[]> {
  const doc = await db.collection('draftOrders').doc(`${year}`).get();
  const data = doc.data();
  if (!data?.slots) {
    throw new Error(`No draft order found for year ${year}`);
  }
  return filterAndSortPickOrder(data.slots as DraftSlot[], rounds);
}

/**
 * Build future draft picks for a draft session.
 * Year+1: uses seeded ownership data from Firestore team docs.
 * Year+2: defaults all teams to owning their own rounds 1-3.
 */
export async function buildFuturePicks(
  draftYear: number,
): Promise<FutureDraftPick[]> {
  const allTeamIds = teams.map((t) => t.id);
  const teamDocs = await db.collection('teams').get();

  const seededPicksByTeam: Record<string, FuturePickSeed[] | undefined> = {};
  for (const doc of teamDocs.docs) {
    seededPicksByTeam[doc.id] = doc.data().futurePicks as
      | FuturePickSeed[]
      | undefined;
  }

  return buildFuturePicksFromSeeds(draftYear, allTeamIds, seededPicksByTeam);
}

export async function recordPickAndAdvance(
  draftId: string,
  playerId: string,
  userId: string | null,
): Promise<{ pick: Pick; isComplete: boolean }> {
  return db.runTransaction(async (transaction) => {
    const draftRef = db.collection('drafts').doc(draftId);
    const draftDoc = await transaction.get(draftRef);

    if (!draftDoc.exists) throw new Error('Draft not found');
    const draft = { id: draftDoc.id, ...draftDoc.data() } as Draft;

    if (draft.status !== 'active') {
      throw new Error('Draft is not active');
    }

    const currentSlot = draft.pickOrder[draft.currentPick - 1];
    if (!currentSlot) throw new Error('No more picks in draft');

    const pickedPlayerIds = draft.pickedPlayerIds ?? [];
    if (pickedPlayerIds.includes(playerId)) {
      throw new Error('Player already drafted');
    }

    const pickRef = draftRef.collection('picks').doc();
    transaction.set(pickRef, {
      draftId,
      overall: currentSlot.overall,
      round: currentSlot.round,
      pick: currentSlot.pick,
      team: currentSlot.team,
      userId,
      playerId,
      createdAt: FieldValue.serverTimestamp(),
    });

    const nextPick = draft.currentPick + 1;
    const isComplete = nextPick > draft.pickOrder.length;
    const nextSlot = isComplete ? null : draft.pickOrder[nextPick - 1];

    transaction.update(draftRef, {
      currentPick: nextPick,
      currentRound: nextSlot?.round ?? currentSlot.round,
      pickedPlayerIds: FieldValue.arrayUnion(playerId),
      status: isComplete ? 'complete' : 'active',
      updatedAt: FieldValue.serverTimestamp(),
    });

    const pick: Pick = {
      id: pickRef.id,
      draftId,
      overall: currentSlot.overall,
      round: currentSlot.round,
      pick: currentSlot.pick,
      team: currentSlot.team,
      userId,
      playerId,
      createdAt: { seconds: 0, nanoseconds: 0 },
    };

    return { pick, isComplete };
  });
}

// ---- Timer Management ----

const draftTimers = new Map<string, NodeJS.Timeout>();

export function setPickTimer(
  draftId: string,
  seconds: number,
  onExpire: () => void,
): void {
  clearPickTimer(draftId);
  if (seconds <= 0) return;
  const timeout = setTimeout(onExpire, seconds * 1000);
  draftTimers.set(draftId, timeout);
}

export function clearPickTimer(draftId: string): void {
  const existing = draftTimers.get(draftId);
  if (existing) {
    clearTimeout(existing);
    draftTimers.delete(draftId);
  }
}
