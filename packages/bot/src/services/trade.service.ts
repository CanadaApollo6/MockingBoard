import { FieldValue } from 'firebase-admin/firestore';
import { db } from '../utils/firestore.js';
import type {
  Trade,
  TradePiece,
  TradeStatus,
  Draft,
  TeamAbbreviation,
} from '@mockingboard/shared';
import { computeTradeExecution } from '@mockingboard/shared';

// Re-export shared pure functions for existing bot consumers
export {
  evaluateCpuTrade,
  type CpuTradeEvaluation,
  validateTradePicksAvailable,
  validateUserOwnsPicks,
  getPicksOwnedByTeam,
  getAvailableCurrentPicks,
  getAvailableFuturePicks,
  getTeamFuturePicks,
} from '@mockingboard/shared';

export interface CreateTradeInput {
  draftId: string;
  proposerId: string;
  proposerTeam: TeamAbbreviation;
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
    proposerTeam: input.proposerTeam,
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

/** Allow FieldValue sentinels (e.g. serverTimestamp) alongside normal types. */
type FirestoreUpdate<T> = {
  [K in keyof T]?: T[K] | FieldValue;
};

export async function updateTrade(
  tradeId: string,
  updates: FirestoreUpdate<
    Omit<Trade, 'id' | 'draftId' | 'proposerId' | 'proposedAt'>
  >,
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
  const isCpuTrade = trade.recipientId === null;
  if (isCpuTrade) {
    if (trade.proposerId !== userId) {
      throw new Error('Only the proposer can confirm a CPU trade');
    }
  } else if (trade.recipientId !== userId) {
    throw new Error('Only the recipient can accept a trade');
  }

  await updateTrade(tradeId, {
    status: 'accepted',
    resolvedAt: FieldValue.serverTimestamp(),
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
    resolvedAt: FieldValue.serverTimestamp(),
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
    resolvedAt: FieldValue.serverTimestamp(),
  });

  return { ...trade, status: 'cancelled' };
}

export async function expireTrade(tradeId: string): Promise<Trade> {
  const trade = await getTrade(tradeId);
  if (!trade) throw new Error('Trade not found');
  if (trade.status !== 'pending') throw new Error('Trade is not pending');

  await updateTrade(tradeId, {
    status: 'expired',
    resolvedAt: FieldValue.serverTimestamp(),
  });

  return { ...trade, status: 'expired' };
}

// ---- Trade Execution ----

/**
 * Execute an accepted trade by updating both pickOrder (current picks)
 * and futurePicks ownership on the draft document.
 */
export async function executeTrade(trade: Trade, draft: Draft): Promise<Draft> {
  const { pickOrder, futurePicks } = computeTradeExecution(trade, draft);

  await db.collection('drafts').doc(draft.id).update({
    pickOrder,
    futurePicks,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { ...draft, pickOrder, futurePicks };
}
