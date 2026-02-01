import 'server-only';

import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from './firebase-admin';
import type {
  Draft,
  DraftFormat,
  DraftSlot,
  FutureDraftPick,
  FuturePickSeed,
  Pick,
  Player,
  Trade,
  TradePiece,
  TradeStatus,
  TeamAbbreviation,
  CpuSpeed,
} from '@mockingboard/shared';
import {
  teams,
  filterAndSortPickOrder,
  buildFuturePicksFromSeeds,
  selectCpuPick,
  getPickController,
  computeTradeExecution,
  evaluateCpuTrade,
  validateTradePicksAvailable,
  validateUserOwnsPicks,
  type CpuTradeEvaluation,
} from '@mockingboard/shared';

// Pre-built team lookup map (same pattern as bot)
const teamSeeds = new Map(teams.map((t) => [t.id, t]));

// ---- Draft Setup ----

export async function buildPickOrder(
  rounds: number,
  year: number,
): Promise<DraftSlot[]> {
  const doc = await adminDb.collection('draftOrders').doc(`${year}`).get();
  const data = doc.data();
  if (!data?.slots) {
    throw new Error(`No draft order found for year ${year}`);
  }
  return filterAndSortPickOrder(data.slots as DraftSlot[], rounds);
}

export async function buildFuturePicks(
  draftYear: number,
): Promise<FutureDraftPick[]> {
  const allTeamIds = teams.map((t) => t.id);
  const teamDocs = await adminDb.collection('teams').get();

  const seededPicksByTeam: Record<string, FuturePickSeed[] | undefined> = {};
  for (const doc of teamDocs.docs) {
    seededPicksByTeam[doc.id] = doc.data().futurePicks as
      | FuturePickSeed[]
      | undefined;
  }

  return buildFuturePicksFromSeeds(draftYear, allTeamIds, seededPicksByTeam);
}

export interface CreateWebDraftInput {
  userId: string;
  discordId: string;
  config: {
    rounds: number;
    format: DraftFormat;
    year: number;
    cpuSpeed: CpuSpeed;
    tradesEnabled: boolean;
  };
  teamAssignments: Record<TeamAbbreviation, string | null>;
  pickOrder: DraftSlot[];
  futurePicks: FutureDraftPick[];
}

export async function createWebDraft(
  input: CreateWebDraftInput,
): Promise<Draft> {
  const now = FieldValue.serverTimestamp();
  const draftData = {
    createdBy: input.userId,
    config: {
      ...input.config,
      secondsPerPick: 0,
      teamAssignmentMode: 'choice' as const,
    },
    platform: 'web' as const,
    status: 'active' as const,
    currentPick: 1,
    currentRound: 1,
    teamAssignments: input.teamAssignments,
    participants: { [input.userId]: input.discordId },
    pickOrder: input.pickOrder,
    futurePicks: input.futurePicks,
    pickedPlayerIds: [] as string[],
    createdAt: now,
    updatedAt: now,
  };

  const docRef = await adminDb.collection('drafts').add(draftData);
  const created = await docRef.get();
  return { id: created.id, ...created.data() } as Draft;
}

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

// ---- CPU Advancement ----

export async function getAvailablePlayers(
  year: number,
  pickedPlayerIds: string[],
): Promise<Player[]> {
  const snapshot = await adminDb
    .collection('players')
    .where('year', '==', year)
    .orderBy('consensusRank')
    .get();

  const pickedSet = new Set(pickedPlayerIds);
  return snapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }) as Player)
    .filter((p) => !pickedSet.has(p.id));
}

/**
 * Run all consecutive CPU picks until the next human pick or draft completion.
 * Returns all CPU picks made.
 */
export async function runCpuCascade(
  draftId: string,
): Promise<{ picks: Pick[]; isComplete: boolean }> {
  const cpuPicks: Pick[] = [];

  while (true) {
    const draftDoc = await adminDb.collection('drafts').doc(draftId).get();
    if (!draftDoc.exists) break;
    const draft = { id: draftDoc.id, ...draftDoc.data() } as Draft;

    if (draft.status !== 'active') {
      return { picks: cpuPicks, isComplete: draft.status === 'complete' };
    }

    const currentSlot = draft.pickOrder[draft.currentPick - 1];
    if (!currentSlot) {
      return { picks: cpuPicks, isComplete: true };
    }

    const controller = getPickController(draft, currentSlot);
    if (controller !== null) {
      // Next pick is a human — stop cascading
      return { picks: cpuPicks, isComplete: false };
    }

    // CPU pick
    const available = await getAvailablePlayers(
      draft.config.year,
      draft.pickedPlayerIds ?? [],
    );
    if (available.length === 0) break;

    const teamSeed = teamSeeds.get(currentSlot.team);
    const teamNeeds = teamSeed?.needs ?? [];
    const player = selectCpuPick(available, teamNeeds);

    const { pick, isComplete } = await recordPick(draftId, player.id, null);
    cpuPicks.push(pick);

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

  const available = await getAvailablePlayers(
    draft.config.year,
    draft.pickedPlayerIds ?? [],
  );
  if (available.length === 0) {
    return { pick: null, isComplete: false };
  }

  const teamSeed = teamSeeds.get(currentSlot.team);
  const teamNeeds = teamSeed?.needs ?? [];
  const player = selectCpuPick(available, teamNeeds);

  const { pick, isComplete } = await recordPick(draftId, player.id, null);
  return { pick, isComplete };
}

// ---- Trade Operations ----

export interface CreateWebTradeInput {
  draftId: string;
  proposerId: string;
  proposerTeam: TeamAbbreviation;
  recipientTeam: TeamAbbreviation;
  proposerGives: TradePiece[];
  proposerReceives: TradePiece[];
  isForceTrade?: boolean;
}

export async function createWebTrade(
  input: CreateWebTradeInput,
): Promise<{ trade: Trade; evaluation: CpuTradeEvaluation }> {
  // Fetch draft for validation
  const draftDoc = await adminDb.collection('drafts').doc(input.draftId).get();
  if (!draftDoc.exists) throw new Error('Draft not found');
  const draft = { id: draftDoc.id, ...draftDoc.data() } as Draft;

  // Validate
  const picksAvailable = validateTradePicksAvailable(
    {
      proposerGives: input.proposerGives,
      proposerReceives: input.proposerReceives,
    } as Trade,
    draft,
  );
  if (!picksAvailable.valid) throw new Error(picksAvailable.error);

  const ownsGiving = validateUserOwnsPicks(
    input.proposerId,
    input.proposerGives,
    draft,
  );
  if (!ownsGiving.valid) throw new Error(ownsGiving.error);

  // Create trade doc
  const now = FieldValue.serverTimestamp();
  const tradeData = {
    draftId: input.draftId,
    status: 'pending' as TradeStatus,
    proposerId: input.proposerId,
    proposerTeam: input.proposerTeam,
    recipientId: null, // CPU trade
    recipientTeam: input.recipientTeam,
    proposerGives: input.proposerGives,
    proposerReceives: input.proposerReceives,
    proposedAt: now,
    isForceTrade: input.isForceTrade ?? false,
  };

  const docRef = await adminDb.collection('trades').add(tradeData);
  const created = await docRef.get();
  const trade = { id: created.id, ...created.data() } as Trade;

  // Evaluate from CPU perspective
  const evaluation = evaluateCpuTrade(trade, draft);

  return { trade, evaluation };
}

export async function executeWebTrade(
  tradeId: string,
  draftId: string,
  force: boolean = false,
): Promise<Draft> {
  const tradeDo = await adminDb.collection('trades').doc(tradeId).get();
  if (!tradeDo.exists) throw new Error('Trade not found');
  const trade = { id: tradeDo.id, ...tradeDo.data() } as Trade;

  const draftDoc = await adminDb.collection('drafts').doc(draftId).get();
  if (!draftDoc.exists) throw new Error('Draft not found');
  const draft = { id: draftDoc.id, ...draftDoc.data() } as Draft;

  // Accept trade
  await adminDb.collection('trades').doc(tradeId).update({
    status: 'accepted',
    isForceTrade: force,
    resolvedAt: FieldValue.serverTimestamp(),
  });

  // Execute ownership changes
  const { pickOrder, futurePicks } = computeTradeExecution(trade, draft);

  await adminDb.collection('drafts').doc(draftId).update({
    pickOrder,
    futurePicks,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { ...draft, pickOrder, futurePicks };
}

export async function cancelWebTrade(tradeId: string): Promise<void> {
  await adminDb.collection('trades').doc(tradeId).update({
    status: 'cancelled',
    resolvedAt: FieldValue.serverTimestamp(),
  });
}
