import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getSessionUser } from '@/lib/firebase/auth-session';
import { getDraftOrFail } from '@/lib/firebase/data';
import { adminDb } from '@/lib/firebase/firebase-admin';
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

    if (draft.status === 'complete' || draft.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Draft cannot be cancelled' },
        { status: 400 },
      );
    }

    await adminDb.collection('drafts').doc(draftId).update({
      status: 'cancelled',
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('Failed to cancel draft:', err);
    return NextResponse.json(
      { error: 'Failed to cancel draft' },
      { status: 500 },
    );
  }
}
