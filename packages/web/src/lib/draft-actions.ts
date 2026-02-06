import 'server-only';

import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from './firebase-admin';
import {
  getCachedDraftOrderSlots,
  getCachedTeamDocs,
  getCachedPlayers,
  getCachedDraftNames,
} from './cache';
import { getBigBoard } from './data';
import type {
  Draft,
  DraftFormat,
  DraftVisibility,
  DraftSlot,
  FutureDraftPick,
  FuturePickSeed,
  NotificationLevel,
  Pick,
  Player,
  TeamAssignmentMode,
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
  getEffectiveNeeds,
  getTeamDraftedPositions,
  getPickController,
  computeTradeExecution,
  evaluateCpuTrade,
  validateTradePicksAvailable,
  validateUserOwnsPicks,
  generateDraftName as _generateDraftName,
  POSITIONAL_VALUE,
  type CpuTradeEvaluation,
} from '@mockingboard/shared';

// Pre-built team lookup map (same pattern as bot)
const teamSeeds = new Map(teams.map((t) => [t.id, t]));

/** Generate a draft name using Firestore overrides if available, else shared defaults. */
async function generateDraftNameFromCache(): Promise<string> {
  const override = await getCachedDraftNames();
  if (override) {
    const adj =
      override.adjectives[
        Math.floor(Math.random() * override.adjectives.length)
      ];
    const noun =
      override.nouns[Math.floor(Math.random() * override.nouns.length)];
    return `${adj} ${noun}`;
  }
  return _generateDraftName();
}

// ---- Draft Setup ----

export async function buildPickOrder(
  rounds: number,
  year: number,
): Promise<DraftSlot[]> {
  const slots = await getCachedDraftOrderSlots(year);
  return filterAndSortPickOrder(slots, rounds);
}

export async function buildFuturePicks(
  draftYear: number,
  draftRounds: number = 7,
): Promise<FutureDraftPick[]> {
  const allTeamIds = teams.map((t) => t.id);
  const cachedTeams = await getCachedTeamDocs();

  const seededPicksByTeam: Record<string, FuturePickSeed[] | undefined> = {};
  for (const doc of cachedTeams) {
    seededPicksByTeam[doc.id] = doc.futurePicks;
  }

  const future = buildFuturePicksFromSeeds(
    draftYear,
    allTeamIds,
    seededPicksByTeam,
  );

  // Add current-year rounds beyond the draft's configured rounds as tradeable assets
  if (draftRounds < 7) {
    const allSlots = await getCachedDraftOrderSlots(draftYear);
    const extraSlots = allSlots.filter((s) => s.round > draftRounds);
    const extraPicks: FutureDraftPick[] = extraSlots.map((s) => ({
      year: draftYear,
      round: s.round,
      originalTeam: s.team,
      ownerTeam: s.team,
      overall: s.overall,
    }));
    return [...extraPicks, ...future];
  }

  return future;
}

export interface CreateWebDraftInput {
  userId: string;
  discordId: string;
  displayName?: string;
  name?: string;
  config: {
    rounds: number;
    format: DraftFormat;
    year: number;
    cpuSpeed: CpuSpeed;
    secondsPerPick?: number;
    tradesEnabled: boolean;
    teamAssignmentMode?: TeamAssignmentMode;
    boardId?: string;
  };
  teamAssignments: Record<TeamAbbreviation, string | null>;
  pickOrder: DraftSlot[];
  futurePicks: FutureDraftPick[];
  notificationLevel?: NotificationLevel;
  multiplayer?: boolean;
  visibility?: DraftVisibility;
}

export async function createWebDraft(
  input: CreateWebDraftInput,
): Promise<Draft> {
  const now = FieldValue.serverTimestamp();
  const isMultiplayer = !!input.multiplayer;

  const draftData: Record<string, unknown> = {
    name: input.name || (await generateDraftNameFromCache()),
    createdBy: input.userId,
    config: {
      ...input.config,
      secondsPerPick: input.config.secondsPerPick ?? 0,
      teamAssignmentMode: input.config.teamAssignmentMode ?? 'choice',
    },
    platform: 'web' as const,
    status: isMultiplayer ? 'lobby' : 'active',
    currentPick: 1,
    currentRound: 1,
    teamAssignments: input.teamAssignments,
    participants: { [input.userId]: input.discordId },
    participantIds: [...new Set([input.userId, input.discordId])],
    participantNames: {
      [input.userId]: input.displayName ?? 'Player 1',
    },
    pickOrder: input.pickOrder,
    futurePicks: input.futurePicks,
    pickedPlayerIds: [] as string[],
    createdAt: now,
    updatedAt: now,
  };

  if (input.notificationLevel && input.notificationLevel !== 'off') {
    draftData.notificationLevel = input.notificationLevel;
  }

  if (isMultiplayer) {
    draftData.visibility = input.visibility ?? 'public';
    if (input.visibility === 'private') {
      draftData.inviteCode = crypto.randomUUID().slice(0, 8);
    }
  }

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

    const teamSeed = teamSeeds.get(currentSlot.team);
    const draftedPositions = getTeamDraftedPositions(
      draft.pickOrder,
      pickedIds,
      currentSlot.team,
      playerMap,
    );
    const effectiveNeeds = getEffectiveNeeds(
      teamSeed?.needs ?? [],
      draftedPositions,
    );
    const player = selectCpuPick(available, effectiveNeeds, {
      randomness: (draft.config.cpuRandomness ?? 50) / 100,
      needsWeight: (draft.config.cpuNeedsWeight ?? 50) / 100,
      boardRankings,
      positionalWeights: POSITIONAL_VALUE,
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

  const teamSeed = teamSeeds.get(currentSlot.team);
  const playerMap = new Map(allPlayers.map((p) => [p.id, p]));
  const draftedPositions = getTeamDraftedPositions(
    draft.pickOrder,
    draft.pickedPlayerIds ?? [],
    currentSlot.team,
    playerMap,
  );
  const effectiveNeeds = getEffectiveNeeds(
    teamSeed?.needs ?? [],
    draftedPositions,
  );
  const player = selectCpuPick(available, effectiveNeeds, {
    randomness: (draft.config.cpuRandomness ?? 50) / 100,
    needsWeight: (draft.config.cpuNeedsWeight ?? 50) / 100,
    boardRankings,
    positionalWeights: POSITIONAL_VALUE,
  });

  const { pick, isComplete } = await recordPick(draftId, player.id, null);
  return { pick, isComplete };
}

// ---- Trade Operations ----

const TRADE_EXPIRY_MS = 2 * 60 * 1000; // 2 minutes for user-to-user trades

export interface CreateWebTradeInput {
  draftId: string;
  proposerId: string;
  proposerTeam: TeamAbbreviation;
  recipientId: string | null;
  recipientTeam: TeamAbbreviation;
  proposerGives: TradePiece[];
  proposerReceives: TradePiece[];
  isForceTrade?: boolean;
}

export async function createWebTrade(
  input: CreateWebTradeInput,
): Promise<{ trade: Trade; evaluation: CpuTradeEvaluation | null }> {
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

  const isUserTrade = !!input.recipientId;

  // Create trade doc
  const now = FieldValue.serverTimestamp();
  const tradeData: Record<string, unknown> = {
    draftId: input.draftId,
    status: 'pending' as TradeStatus,
    proposerId: input.proposerId,
    proposerTeam: input.proposerTeam,
    recipientId: input.recipientId,
    recipientTeam: input.recipientTeam,
    proposerGives: input.proposerGives,
    proposerReceives: input.proposerReceives,
    proposedAt: now,
    isForceTrade: input.isForceTrade ?? false,
  };

  if (isUserTrade) {
    tradeData.expiresAt = new Date(Date.now() + TRADE_EXPIRY_MS);
  }

  const docRef = await adminDb.collection('trades').add(tradeData);
  const created = await docRef.get();
  const trade = { id: created.id, ...created.data() } as Trade;

  // Only evaluate CPU trades
  const evaluation = isUserTrade ? null : evaluateCpuTrade(trade, draft);

  return { trade, evaluation };
}

export async function executeWebTrade(
  tradeId: string,
  draftId: string,
  force: boolean = false,
): Promise<Draft> {
  return adminDb.runTransaction(async (tx) => {
    const tradeRef = adminDb.collection('trades').doc(tradeId);
    const draftRef = adminDb.collection('drafts').doc(draftId);
    const [tradeSnap, draftSnap] = await Promise.all([
      tx.get(tradeRef),
      tx.get(draftRef),
    ]);

    if (!tradeSnap.exists) throw new Error('Trade not found');
    if (!draftSnap.exists) throw new Error('Draft not found');

    const trade = { id: tradeSnap.id, ...tradeSnap.data() } as Trade;
    const draft = { id: draftSnap.id, ...draftSnap.data() } as Draft;

    if (trade.status !== 'pending') throw new Error('Trade is not pending');

    const { pickOrder, futurePicks } = computeTradeExecution(trade, draft);

    tx.update(tradeRef, {
      status: 'accepted',
      isForceTrade: force,
      resolvedAt: FieldValue.serverTimestamp(),
    });
    tx.update(draftRef, {
      pickOrder,
      futurePicks,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return { ...draft, pickOrder, futurePicks };
  });
}

export async function rejectWebTrade(
  tradeId: string,
  userId: string,
): Promise<void> {
  const doc = await adminDb.collection('trades').doc(tradeId).get();
  if (!doc.exists) throw new Error('Trade not found');
  const trade = doc.data() as Trade;
  if (trade.recipientId !== userId) throw new Error('Not authorized');
  if (trade.status !== 'pending') throw new Error('Trade is not pending');

  await adminDb.collection('trades').doc(tradeId).update({
    status: 'rejected',
    resolvedAt: FieldValue.serverTimestamp(),
  });
}

export async function cancelWebTrade(
  tradeId: string,
  userId: string,
): Promise<void> {
  const doc = await adminDb.collection('trades').doc(tradeId).get();
  if (!doc.exists) throw new Error('Trade not found');
  const trade = doc.data() as Trade;
  if (trade.proposerId !== userId) throw new Error('Not authorized');
  if (trade.status !== 'pending') throw new Error('Trade is not pending');

  await adminDb.collection('trades').doc(tradeId).update({
    status: 'cancelled',
    resolvedAt: FieldValue.serverTimestamp(),
  });
}

export function isTradeExpired(trade: Trade): boolean {
  if (!trade.expiresAt) return false;
  const expiresMs =
    'seconds' in trade.expiresAt
      ? trade.expiresAt.seconds * 1000
      : new Date(trade.expiresAt as unknown as string).getTime();
  return Date.now() > expiresMs;
}
