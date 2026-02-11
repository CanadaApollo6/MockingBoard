import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getSessionUser } from '@/lib/auth-session';
import { getDraftOrFail } from '@/lib/data';
import { adminDb } from '@/lib/firebase-admin';
import { AppError, safeError } from '@/lib/validate';
import type { DraftSlot, FutureDraftPick } from '@mockingboard/shared';

interface SyncPick {
  draftId: string;
  overall: number;
  round: number;
  pick: number;
  team: string;
  userId: string | null;
  playerId: string;
}

interface SyncBody {
  status: string;
  currentPick: number;
  currentRound: number;
  pickedPlayerIds: string[];
  pickOrder: DraftSlot[];
  futurePicks?: FutureDraftPick[];
  picks: SyncPick[];
  reason: string;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ draftId: string }> },
) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { draftId } = await params;

  let body: SyncBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 },
    );
  }

  try {
    const draft = await getDraftOrFail(draftId);

    // Only single-user drafts can use this endpoint
    const participantIds = Object.keys(draft.participants);
    if (participantIds.length !== 1 || participantIds[0] !== session.uid) {
      return NextResponse.json(
        { error: 'Not authorized for this draft' },
        { status: 403 },
      );
    }

    const draftRef = adminDb.collection('drafts').doc(draftId);
    const batch = adminDb.batch();

    // Update draft document
    const draftUpdate: FirebaseFirestore.UpdateData<FirebaseFirestore.DocumentData> =
      {
        status: body.status,
        currentPick: body.currentPick,
        currentRound: body.currentRound,
        pickedPlayerIds: body.pickedPlayerIds,
        pickOrder: body.pickOrder,
        updatedAt: FieldValue.serverTimestamp(),
      };
    if (body.futurePicks !== undefined) {
      draftUpdate.futurePicks = body.futurePicks;
    }
    batch.update(draftRef, draftUpdate);

    // Write new pick documents
    for (const pick of body.picks) {
      const pickRef = draftRef.collection('picks').doc();
      batch.set(pickRef, {
        draftId,
        overall: pick.overall,
        round: pick.round,
        pick: pick.pick,
        team: pick.team,
        userId: pick.userId,
        playerId: pick.playerId,
        createdAt: FieldValue.serverTimestamp(),
      });
    }

    await batch.commit();

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('Failed to sync draft:', err);
    return NextResponse.json(
      { error: safeError(err, 'Failed to sync draft') },
      { status: 500 },
    );
  }
}
