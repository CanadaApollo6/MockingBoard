import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getSessionUser } from '@/lib/auth-session';
import { adminDb } from '@/lib/firebase-admin';
import { resolveUser } from '@/lib/user-resolve';
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

    const user = await resolveUser(session.uid);
    const isCreator =
      draft.createdBy === session.uid ||
      (user?.discordId != null && draft.createdBy === user.discordId);
    if (!isCreator) {
      return NextResponse.json(
        { error: 'Only the draft creator can resume' },
        { status: 403 },
      );
    }

    if (draft.status !== 'paused') {
      return NextResponse.json(
        { error: 'Draft is not paused' },
        { status: 400 },
      );
    }

    await adminDb.collection('drafts').doc(draftId).update({
      status: 'active',
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Failed to resume draft:', err);
    return NextResponse.json(
      { error: 'Failed to resume draft' },
      { status: 500 },
    );
  }
}
