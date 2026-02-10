import 'server-only';

import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '../firebase-admin';
import { getCachedPlayers } from '../cache';
import { getBigBoard } from '../data';
import type { Draft, Pick, Player } from '@mockingboard/shared';
import {
  prepareCpuPick,
  getPickController,
  POSITIONAL_VALUE,
} from '@mockingboard/shared';

// ---- Pick Recording ----

export async function recordPick(
  draftId: string,
  playerId: string,
  userId: string | null,
): Promise<{ pick: Pick; isComplete: boolean }> {
  return adminDb.runTransaction(async (transaction) => {
    const draftRef = adminDb.collection('drafts').doc(draftId);
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
      team: currentSlot.teamOverride ?? currentSlot.team,
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
      team: currentSlot.teamOverride ?? currentSlot.team,
      userId,
      playerId,
      createdAt: { seconds: 0, nanoseconds: 0 },
    };

    return { pick, isComplete };
  });
}

// ---- CPU Advancement ----

export async function getAvailablePlayers(
  year: number,
  pickedPlayerIds: string[],
): Promise<Player[]> {
  const allPlayers = await getCachedPlayers(year);
  const pickedSet = new Set(pickedPlayerIds);
  return allPlayers.filter((p) => !pickedSet.has(p.id));
}

/**
 * Run all consecutive CPU picks until the next human pick or draft completion.
 * Returns all CPU picks made.
 *
 * The draft document is read once at the start; pick state (currentPick,
 * pickedPlayerIds) is tracked in memory to avoid repeated Firestore reads.
 * Draft status is re-checked every STATUS_CHECK_INTERVAL picks to catch pauses.
 */
export async function runCpuCascade(
  draftId: string,
): Promise<{ picks: Pick[]; isComplete: boolean }> {
  const cpuPicks: Pick[] = [];

  // Read draft once at the start
  const draftDoc = await adminDb.collection('drafts').doc(draftId).get();
  if (!draftDoc.exists) return { picks: cpuPicks, isComplete: false };
  const draft = { id: draftDoc.id, ...draftDoc.data() } as Draft;

  if (draft.status !== 'active') {
    return { picks: cpuPicks, isComplete: draft.status === 'complete' };
  }

  // Load players and board once
  const allPlayers = await getCachedPlayers(draft.config.year);
  const playerMap = new Map(allPlayers.map((p) => [p.id, p]));
  let boardRankings: string[] | undefined;
  if (draft.config.boardId) {
    const board = await getBigBoard(draft.config.boardId);
    boardRankings = board?.rankings;
  }

  // Track mutable pick state in memory
  let currentPick = draft.currentPick;
  const pickedIds = [...(draft.pickedPlayerIds ?? [])];
  const pickedSet = new Set(pickedIds);
  const STATUS_CHECK_INTERVAL = 8;

  while (true) {
    // Periodically re-check draft status to catch pauses/cancellations
    if (cpuPicks.length > 0 && cpuPicks.length % STATUS_CHECK_INTERVAL === 0) {
      const statusDoc = await adminDb.collection('drafts').doc(draftId).get();
      if (!statusDoc.exists) break;
      const freshStatus = statusDoc.data()?.status;
      if (freshStatus !== 'active') {
        return { picks: cpuPicks, isComplete: freshStatus === 'complete' };
      }
    }

    const currentSlot = draft.pickOrder[currentPick - 1];
    if (!currentSlot) {
      return { picks: cpuPicks, isComplete: true };
    }

    const controller = getPickController(draft, currentSlot);
    if (controller !== null) {
      // Next pick is a human — stop cascading
      return { picks: cpuPicks, isComplete: false };
    }

    const available = allPlayers.filter((p) => !pickedSet.has(p.id));
    if (available.length === 0) break;

    const player = prepareCpuPick({
      team: currentSlot.team,
      pickOrder: draft.pickOrder,
      pickedPlayerIds: pickedIds,
      playerMap,
      available,
      options: {
        randomness: (draft.config.cpuRandomness ?? 50) / 100,
        needsWeight: (draft.config.cpuNeedsWeight ?? 50) / 100,
        boardRankings,
        positionalWeights: POSITIONAL_VALUE,
      },
    });

    const { pick, isComplete } = await recordPick(draftId, player.id, null);
    cpuPicks.push(pick);

    // Update in-memory state
    pickedIds.push(player.id);
    pickedSet.add(player.id);
    currentPick++;

    if (isComplete) {
      return { picks: cpuPicks, isComplete: true };
    }
  }

  return { picks: cpuPicks, isComplete: false };
}

/**
 * Make a single CPU pick (for trades+non-instant mode).
 */
export async function advanceSingleCpuPick(
  draftId: string,
): Promise<{ pick: Pick | null; isComplete: boolean }> {
  const draftDoc = await adminDb.collection('drafts').doc(draftId).get();
  if (!draftDoc.exists) throw new Error('Draft not found');
  const draft = { id: draftDoc.id, ...draftDoc.data() } as Draft;

  if (draft.status !== 'active') {
    return { pick: null, isComplete: draft.status === 'complete' };
  }

  const currentSlot = draft.pickOrder[draft.currentPick - 1];
  if (!currentSlot) {
    return { pick: null, isComplete: true };
  }

  const controller = getPickController(draft, currentSlot);
  if (controller !== null) {
    // Not a CPU pick
    return { pick: null, isComplete: false };
  }

  const allPlayers = await getCachedPlayers(draft.config.year);
  const pickedSet = new Set(draft.pickedPlayerIds ?? []);
  const available = allPlayers.filter((p) => !pickedSet.has(p.id));
  if (available.length === 0) {
    return { pick: null, isComplete: false };
  }

  let boardRankings: string[] | undefined;
  if (draft.config.boardId) {
    const board = await getBigBoard(draft.config.boardId);
    boardRankings = board?.rankings;
  }

  const playerMap = new Map(allPlayers.map((p) => [p.id, p]));
  const player = prepareCpuPick({
    team: currentSlot.team,
    pickOrder: draft.pickOrder,
    pickedPlayerIds: draft.pickedPlayerIds ?? [],
    playerMap,
    available,
    options: {
      randomness: (draft.config.cpuRandomness ?? 50) / 100,
      needsWeight: (draft.config.cpuNeedsWeight ?? 50) / 100,
      boardRankings,
      positionalWeights: POSITIONAL_VALUE,
    },
  });

  const { pick, isComplete } = await recordPick(draftId, player.id, null);
  return { pick, isComplete };
}
