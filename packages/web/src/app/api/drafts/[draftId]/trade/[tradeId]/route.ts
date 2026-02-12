import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/firebase/auth-session';
import {
  executeWebTrade,
  cancelWebTrade,
  rejectWebTrade,
  isTradeExpired,
} from '@/lib/draft-actions';
import { adminDb } from '@/lib/firebase/firebase-admin';
import { notifyTradeAccepted } from '@/lib/notifications';
import { hydrateDoc } from '@/lib/firebase/sanitize';
import { safeError } from '@/lib/validate';
import type { Trade } from '@mockingboard/shared';

type TradeAction = 'confirm' | 'force' | 'cancel' | 'accept' | 'reject';

function sendTradeNotifications(trade: Trade, draftId: string) {
  if (!trade.recipientId) return; // CPU trades don't need notifications

  const recipientId = trade.recipientId;
  Promise.all([
    adminDb.collection('drafts').doc(draftId).get(),
    adminDb.collection('users').doc(trade.proposerId).get(),
    adminDb.collection('users').doc(recipientId).get(),
  ])
    .then(([draftSnap, proposerSnap, recipientSnap]) => {
      const draftName = draftSnap.data()?.name ?? 'Draft';
      const proposerName = proposerSnap.data()?.displayName ?? 'A manager';
      const recipientName = recipientSnap.data()?.displayName ?? 'A manager';
      return Promise.all([
        notifyTradeAccepted(
          trade.proposerId,
          draftId,
          draftName,
          recipientName,
        ),
        notifyTradeAccepted(recipientId, draftId, draftName, proposerName),
      ]);
    })
    .catch((err) => console.error('Trade notification failed:', err));
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ draftId: string; tradeId: string }> },
) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { draftId, tradeId } = await params;

  let body: { action: TradeAction };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 },
    );
  }

  try {
    // Fetch trade for authorization + expiration checks
    const tradeDoc = await adminDb.collection('trades').doc(tradeId).get();
    if (!tradeDoc.exists) {
      return NextResponse.json({ error: 'Trade not found' }, { status: 404 });
    }
    const trade = hydrateDoc<Trade>(tradeDoc);

    if (trade.status !== 'pending') {
      return NextResponse.json(
        { error: 'Trade is not pending' },
        { status: 400 },
      );
    }

    if (isTradeExpired(trade)) {
      return NextResponse.json({ error: 'Trade has expired' }, { status: 410 });
    }

    // Authorization based on action
    switch (body.action) {
      case 'cancel': {
        if (trade.proposerId !== session.uid) {
          return NextResponse.json(
            { error: 'Not authorized' },
            { status: 403 },
          );
        }
        await cancelWebTrade(tradeId, session.uid);
        return NextResponse.json({ status: 'cancelled' });
      }

      case 'confirm':
      case 'force': {
        if (trade.proposerId !== session.uid) {
          return NextResponse.json(
            { error: 'Not authorized' },
            { status: 403 },
          );
        }
        const force = body.action === 'force';
        const draft = await executeWebTrade(tradeId, draftId, force);

        // Fire-and-forget: notify both parties
        sendTradeNotifications(trade, draftId);

        return NextResponse.json({ status: 'executed', draft });
      }

      case 'accept': {
        if (trade.recipientId !== session.uid) {
          return NextResponse.json(
            { error: 'Not authorized' },
            { status: 403 },
          );
        }
        const draft = await executeWebTrade(tradeId, draftId, false);

        // Fire-and-forget: notify both parties
        sendTradeNotifications(trade, draftId);

        return NextResponse.json({ status: 'executed', draft });
      }

      case 'reject': {
        if (trade.recipientId !== session.uid) {
          return NextResponse.json(
            { error: 'Not authorized' },
            { status: 403 },
          );
        }
        await rejectWebTrade(tradeId, session.uid);
        return NextResponse.json({ status: 'rejected' });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (err) {
    console.error('Failed to process trade:', err);
    return NextResponse.json(
      {
        error: safeError(err, 'Failed to process trade'),
      },
      { status: 500 },
    );
  }
}
