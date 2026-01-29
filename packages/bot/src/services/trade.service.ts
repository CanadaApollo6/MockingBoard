import { FieldValue } from 'firebase-admin/firestore';
import { db } from '../utils/firestore.js';
import type {
  Trade,
  TradePiece,
  TradeStatus,
  Draft,
  DraftSlot,
  TeamAbbreviation,
} from '@mockingboard/shared';
import {
  getPickValue,
  getFuturePickValue,
  getPickRound,
} from '@mockingboard/shared';
import { getPickController } from './draft.service.js';

export interface CreateTradeInput {
  draftId: string;
  proposerId: string;
  recipientId: string | null; // null = CPU trade
  recipientTeam: TeamAbbreviation;
  proposerGives: TradePiece[];
  proposerReceives: TradePiece[];
  isForceTrade?: boolean;
}

export async function createTrade(input: CreateTradeInput): Promise<Trade> {
  const now = FieldValue.serverTimestamp();
  const tradeData = {
    draftId: input.draftId,
    status: 'pending' as TradeStatus,
    proposerId: input.proposerId,
    recipientId: input.recipientId,
    recipientTeam: input.recipientTeam,
    proposerGives: input.proposerGives,
    proposerReceives: input.proposerReceives,
    proposedAt: now,
    isForceTrade: input.isForceTrade ?? false,
  };

  const docRef = await db.collection('trades').add(tradeData);
  const created = await docRef.get();
  return { id: created.id, ...created.data() } as Trade;
}

export async function getTrade(tradeId: string): Promise<Trade | null> {
  const doc = await db.collection('trades').doc(tradeId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() } as Trade;
}

export async function updateTrade(
  tradeId: string,
  updates: Partial<Omit<Trade, 'id' | 'draftId' | 'proposerId' | 'proposedAt'>>,
): Promise<void> {
  await db.collection('trades').doc(tradeId).update(updates);
}

export async function getPendingTradesForDraft(
  draftId: string,
): Promise<Trade[]> {
  const snapshot = await db
    .collection('trades')
    .where('draftId', '==', draftId)
    .where('status', '==', 'pending')
    .get();

  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Trade);
}

export async function getPendingTradesForUser(
  draftId: string,
  userId: string,
): Promise<Trade[]> {
  // Get trades where user is either proposer or recipient
  const [asProposer, asRecipient] = await Promise.all([
    db
      .collection('trades')
      .where('draftId', '==', draftId)
      .where('status', '==', 'pending')
      .where('proposerId', '==', userId)
      .get(),
    db
      .collection('trades')
      .where('draftId', '==', draftId)
      .where('status', '==', 'pending')
      .where('recipientId', '==', userId)
      .get(),
  ]);

  const trades: Trade[] = [];
  for (const doc of asProposer.docs) {
    trades.push({ id: doc.id, ...doc.data() } as Trade);
  }
  for (const doc of asRecipient.docs) {
    trades.push({ id: doc.id, ...doc.data() } as Trade);
  }
  return trades;
}

// ---- Trade Resolution ----

export async function acceptTrade(
  tradeId: string,
  userId: string,
): Promise<Trade> {
  const trade = await getTrade(tradeId);
  if (!trade) throw new Error('Trade not found');
  if (trade.status !== 'pending') throw new Error('Trade is not pending');
  if (trade.recipientId !== userId) {
    throw new Error('Only the recipient can accept a trade');
  }

  await updateTrade(tradeId, {
    status: 'accepted',
    resolvedAt: FieldValue.serverTimestamp() as unknown as Trade['resolvedAt'],
  });

  return { ...trade, status: 'accepted' };
}

export async function rejectTrade(
  tradeId: string,
  userId: string,
): Promise<Trade> {
  const trade = await getTrade(tradeId);
  if (!trade) throw new Error('Trade not found');
  if (trade.status !== 'pending') throw new Error('Trade is not pending');
  if (trade.recipientId !== userId) {
    throw new Error('Only the recipient can reject a trade');
  }

  await updateTrade(tradeId, {
    status: 'rejected',
    resolvedAt: FieldValue.serverTimestamp() as unknown as Trade['resolvedAt'],
  });

  return { ...trade, status: 'rejected' };
}

export async function cancelTrade(
  tradeId: string,
  userId: string,
): Promise<Trade> {
  const trade = await getTrade(tradeId);
  if (!trade) throw new Error('Trade not found');
  if (trade.status !== 'pending') throw new Error('Trade is not pending');
  if (trade.proposerId !== userId) {
    throw new Error('Only the proposer can cancel a trade');
  }

  await updateTrade(tradeId, {
    status: 'cancelled',
    resolvedAt: FieldValue.serverTimestamp() as unknown as Trade['resolvedAt'],
  });

  return { ...trade, status: 'cancelled' };
}

export async function expireTrade(tradeId: string): Promise<Trade> {
  const trade = await getTrade(tradeId);
  if (!trade) throw new Error('Trade not found');
  if (trade.status !== 'pending') throw new Error('Trade is not pending');

  await updateTrade(tradeId, {
    status: 'expired',
    resolvedAt: FieldValue.serverTimestamp() as unknown as Trade['resolvedAt'],
  });

  return { ...trade, status: 'expired' };
}

// ---- CPU Trade Evaluation ----

export interface CpuTradeEvaluation {
  accept: boolean;
  reason: string;
  cpuGivingValue: number;
  cpuReceivingValue: number;
  netValue: number;
}

/**
 * Evaluate a trade from the CPU's perspective.
 * CPU accepts if they're getting at least 95% of what they're giving up.
 */
export function evaluateCpuTrade(
  trade: Trade,
  draft: Draft,
): CpuTradeEvaluation {
  // From CPU's perspective:
  // - CPU is "giving" what the proposer receives
  // - CPU is "receiving" what the proposer gives

  const cpuGivingPicks: number[] = [];
  const cpuReceivingPicks: number[] = [];

  // What CPU gives (proposer receives)
  for (const piece of trade.proposerReceives) {
    if (piece.type === 'current-pick' && piece.overall) {
      cpuGivingPicks.push(piece.overall);
    }
    // Future picks are handled in the value calculation below
  }

  // What CPU receives (proposer gives)
  for (const piece of trade.proposerGives) {
    if (piece.type === 'current-pick' && piece.overall) {
      cpuReceivingPicks.push(piece.overall);
    }
  }

  // Check if user is acquiring a Round 1 pick they didn't originally own
  const acquiringRound1 = trade.proposerReceives.some(
    (p) =>
      p.type === 'current-pick' && p.overall && getPickRound(p.overall) === 1,
  );

  // Calculate values
  let cpuGivingValue = cpuGivingPicks.reduce(
    (sum, pick) => sum + getPickValue(pick),
    0,
  );
  let cpuReceivingValue = cpuReceivingPicks.reduce(
    (sum, pick) => sum + getPickValue(pick),
    0,
  );

  // Add future pick values
  for (const piece of trade.proposerReceives) {
    if (piece.type === 'future-pick' && piece.year && piece.round) {
      const yearsOut = piece.year - draft.config.year;
      cpuGivingValue += getFuturePickValue(piece.round, yearsOut);
    }
  }

  for (const piece of trade.proposerGives) {
    if (piece.type === 'future-pick' && piece.year && piece.round) {
      const yearsOut = piece.year - draft.config.year;
      cpuReceivingValue += getFuturePickValue(piece.round, yearsOut);
    }
  }

  // Apply Round 1 premium if user is acquiring a first round pick
  const premium = acquiringRound1 ? 45 : 0;
  cpuReceivingValue += premium;

  const netValue = cpuReceivingValue - cpuGivingValue;

  // CPU accepts if they're getting at least 95% of what they're giving
  const threshold = cpuGivingValue * 0.95;
  const accept = cpuReceivingValue >= threshold;

  let reason: string;
  if (accept) {
    if (netValue > 0) {
      reason = `CPU gains ${netValue.toFixed(1)} points in value`;
    } else {
      reason = `Trade is fair (within 5% tolerance)`;
    }
  } else {
    const deficit = threshold - cpuReceivingValue;
    reason = `CPU would lose ${deficit.toFixed(1)} points beyond acceptable threshold`;
  }

  return {
    accept,
    reason,
    cpuGivingValue,
    cpuReceivingValue,
    netValue,
  };
}

// ---- Trade Execution ----

/**
 * Execute an accepted trade by updating the draft's pickOrder with ownerOverride.
 * This should be called after a trade is accepted.
 */
export async function executeTrade(trade: Trade, draft: Draft): Promise<Draft> {
  // Find the picks being traded and update their ownerOverride
  const updatedPickOrder = draft.pickOrder.map((slot) => {
    // Check if this slot is being given by the proposer (transfer to recipient/CPU)
    const isGivenByProposer = trade.proposerGives.some(
      (p) => p.type === 'current-pick' && p.overall === slot.overall,
    );

    if (isGivenByProposer) {
      // Transfer ownership to the recipient (or CPU team's controller)
      // For CPU trades, recipientId is null, so we need to set ownerOverride to null
      // to indicate the pick goes back to the original team (CPU)
      return {
        ...slot,
        ownerOverride: trade.recipientId ?? undefined,
      };
    }

    // Check if this slot is being received by the proposer
    const isReceivedByProposer = trade.proposerReceives.some(
      (p) => p.type === 'current-pick' && p.overall === slot.overall,
    );

    if (isReceivedByProposer) {
      // Transfer ownership to the proposer
      return {
        ...slot,
        ownerOverride: trade.proposerId,
      };
    }

    return slot;
  });

  // Update the draft with the new pickOrder
  await db.collection('drafts').doc(draft.id).update({
    pickOrder: updatedPickOrder,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { ...draft, pickOrder: updatedPickOrder };
}

// ---- Validation ----

/**
 * Check if a trade involves any picks that have already been made.
 */
export function validateTradePicksAvailable(
  trade: Trade,
  draft: Draft,
): { valid: boolean; error?: string } {
  const currentPick = draft.currentPick;

  for (const piece of [...trade.proposerGives, ...trade.proposerReceives]) {
    if (piece.type === 'current-pick' && piece.overall) {
      if (piece.overall < currentPick) {
        return {
          valid: false,
          error: `Pick #${piece.overall} has already been made`,
        };
      }
    }
  }

  return { valid: true };
}

/**
 * Check if user owns the picks they're trying to trade.
 */
export function validateUserOwnsPicks(
  userId: string,
  pieces: TradePiece[],
  draft: Draft,
): { valid: boolean; error?: string } {
  for (const piece of pieces) {
    if (piece.type === 'current-pick' && piece.overall) {
      const slot = draft.pickOrder.find((s) => s.overall === piece.overall);
      if (!slot) {
        return { valid: false, error: `Pick #${piece.overall} not found` };
      }
      const controller = getPickController(draft, slot);
      if (controller !== userId) {
        return {
          valid: false,
          error: `You don't control pick #${piece.overall}`,
        };
      }
    }
  }

  return { valid: true };
}

/**
 * Get the picks controlled by a team (including via trades).
 */
export function getPicksOwnedByTeam(
  team: TeamAbbreviation,
  draft: Draft,
): DraftSlot[] {
  const teamUserId = draft.teamAssignments[team];
  return draft.pickOrder.filter((slot) => {
    const controller = getPickController(draft, slot);
    return controller === teamUserId;
  });
}

/**
 * Get all future picks (not in current draft) remaining for the draft.
 * Returns picks that haven't been made yet.
 */
export function getAvailableCurrentPicks(
  draft: Draft,
  forUserId: string,
): DraftSlot[] {
  return draft.pickOrder.filter((slot) => {
    if (slot.overall < draft.currentPick) return false;
    const controller = getPickController(draft, slot);
    return controller === forUserId;
  });
}
