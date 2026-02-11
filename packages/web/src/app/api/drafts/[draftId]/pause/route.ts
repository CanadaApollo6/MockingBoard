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

    if (draft.status !== 'active') {
      return NextResponse.json(
        { error: 'Draft is not active' },
        { status: 400 },
      );
    }

    await adminDb.collection('drafts').doc(draftId).update({
      status: 'paused',
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('Failed to pause draft:', err);
    return NextResponse.json(
      { error: 'Failed to pause draft' },
      { status: 500 },
    );
  }
}
