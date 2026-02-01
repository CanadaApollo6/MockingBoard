import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-session';
import { recordPick, runCpuCascade } from '@/lib/draft-actions';
import { adminDb } from '@/lib/firebase-admin';
import { getPickController } from '@mockingboard/shared';
import type { Draft } from '@mockingboard/shared';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ draftId: string }> },
) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { draftId } = await params;

  let body: { playerId: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 },
    );
  }

  const { playerId } = body;
  if (!playerId) {
    return NextResponse.json({ error: 'Missing playerId' }, { status: 400 });
  }

  try {
    // Authorization: verify user controls current pick
    const draftDoc = await adminDb.collection('drafts').doc(draftId).get();
    if (!draftDoc.exists) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
    }
    const draft = { id: draftDoc.id, ...draftDoc.data() } as Draft;

    if (draft.status !== 'active') {
      return NextResponse.json(
        { error: 'Draft is not active' },
        { status: 400 },
      );
    }

    const currentSlot = draft.pickOrder[draft.currentPick - 1];
    if (!currentSlot) {
      return NextResponse.json({ error: 'No more picks' }, { status: 400 });
    }

    const controller = getPickController(draft, currentSlot);
    if (controller !== session.uid) {
      return NextResponse.json({ error: 'Not your turn' }, { status: 403 });
    }

    // Record the user's pick
    const { pick, isComplete: pickComplete } = await recordPick(
      draftId,
      playerId,
      session.uid,
    );

    // Run CPU cascade if appropriate
    if (!pickComplete) {
      const shouldBatchCpu =
        !draft.config.tradesEnabled || draft.config.cpuSpeed === 'instant';
      if (shouldBatchCpu) {
        const cascade = await runCpuCascade(draftId);
        return NextResponse.json({ pick, isComplete: cascade.isComplete });
      }
    }

    return NextResponse.json({ pick, isComplete: pickComplete });
  } catch (err) {
    console.error('Failed to record pick:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to record pick' },
      { status: 500 },
    );
  }
}
