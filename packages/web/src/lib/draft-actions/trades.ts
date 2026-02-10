import 'server-only';

import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '../firebase-admin';
import type {
  Draft,
  Trade,
  TradePiece,
  TradeStatus,
  TeamAbbreviation,
} from '@mockingboard/shared';
import {
  computeTradeExecution,
  evaluateCpuTrade,
  validateTradePicksAvailable,
  validateUserOwnsPicks,
  type CpuTradeEvaluation,
} from '@mockingboard/shared';

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
