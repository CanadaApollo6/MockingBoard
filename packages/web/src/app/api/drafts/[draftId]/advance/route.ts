import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-session';
import { advanceSingleCpuPick } from '@/lib/draft-actions';
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

  // Verify user is a participant
  const draftDoc = await adminDb.collection('drafts').doc(draftId).get();
  if (!draftDoc.exists) {
    return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
  }
  const draft = { id: draftDoc.id, ...draftDoc.data() } as Draft;

  if (!draft.participants[session.uid]) {
    return NextResponse.json({ error: 'Not a participant' }, { status: 403 });
  }

  try {
    const { pick, isComplete } = await advanceSingleCpuPick(draftId);
    return NextResponse.json({ pick, isComplete });
  } catch (err) {
    console.error('Failed to advance CPU pick:', err);
    return NextResponse.json(
      { error: 'Failed to advance pick' },
      { status: 500 },
    );
  }
}
