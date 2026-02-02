import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-session';
import {
  executeWebTrade,
  cancelWebTrade,
  rejectWebTrade,
  isTradeExpired,
} from '@/lib/draft-actions';
import { adminDb } from '@/lib/firebase-admin';
import type { Trade } from '@mockingboard/shared';

type TradeAction = 'confirm' | 'force' | 'cancel' | 'accept' | 'reject';

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
    const trade = { id: tradeDoc.id, ...tradeDoc.data() } as Trade;

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
        error: err instanceof Error ? err.message : 'Failed to process trade',
      },
      { status: 500 },
    );
  }
}
