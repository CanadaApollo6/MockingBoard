import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getSessionUser } from '@/lib/auth-session';
import { adminDb } from '@/lib/firebase-admin';
import type { Draft } from '@mockingboard/shared';

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
    const draftDoc = await adminDb.collection('drafts').doc(draftId).get();
    if (!draftDoc.exists) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
    }
    const draft = { id: draftDoc.id, ...draftDoc.data() } as Draft;

    if (draft.createdBy !== session.uid) {
      return NextResponse.json(
        { error: 'Only the draft creator can pause' },
        { status: 403 },
      );
    }

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

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Failed to pause draft:', err);
    return NextResponse.json(
      { error: 'Failed to pause draft' },
      { status: 500 },
    );
  }
}
