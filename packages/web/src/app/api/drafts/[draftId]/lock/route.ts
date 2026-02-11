import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getSessionUser } from '@/lib/auth-session';
import { getDraftOrFail } from '@/lib/data';
import { adminDb } from '@/lib/firebase-admin';
import { assertDraftCreator } from '@/lib/user-resolve';
import { AppError } from '@/lib/validate';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ draftId: string }> },
) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { draftId } = await params;

  try {
    const draft = await getDraftOrFail(draftId);
    await assertDraftCreator(session.uid, draft);

    if (draft.status !== 'complete') {
      return NextResponse.json(
        { error: 'Only completed drafts can be locked as predictions' },
        { status: 400 },
      );
    }

    if (draft.isLocked) {
      return NextResponse.json(
        { error: 'Draft is already locked' },
        { status: 400 },
      );
    }

    await adminDb.collection('drafts').doc(draftId).update({
      isLocked: true,
      lockedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('Failed to lock draft:', err);
    return NextResponse.json(
      { error: 'Failed to lock draft' },
      { status: 500 },
    );
  }
}
