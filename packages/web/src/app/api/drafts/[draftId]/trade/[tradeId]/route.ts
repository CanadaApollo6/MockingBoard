import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-session';
import { executeWebTrade, cancelWebTrade } from '@/lib/draft-actions';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ draftId: string; tradeId: string }> },
) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { draftId, tradeId } = await params;

  let body: { action: 'confirm' | 'force' | 'cancel' };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 },
    );
  }

  try {
    if (body.action === 'cancel') {
      await cancelWebTrade(tradeId);
      return NextResponse.json({ status: 'cancelled' });
    }

    const force = body.action === 'force';
    const draft = await executeWebTrade(tradeId, draftId, force);
    return NextResponse.json({ status: 'executed', draft });
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
