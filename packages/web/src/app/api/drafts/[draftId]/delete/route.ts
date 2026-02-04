import { NextResponse } from 'next/server';
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
        { error: 'Only the draft creator can delete' },
        { status: 403 },
      );
    }

    if (draft.status !== 'complete' && draft.status !== 'cancelled') {
      return NextResponse.json(
        { error: 'Only completed or cancelled drafts can be deleted' },
        { status: 400 },
      );
    }

    const picksSnapshot = await adminDb
      .collection('drafts')
      .doc(draftId)
      .collection('picks')
      .get();

    const tradesSnapshot = await adminDb
      .collection('trades')
      .where('draftId', '==', draftId)
      .get();

    // Firestore batches support up to 500 operations
    const allRefs = [
      ...picksSnapshot.docs.map((d) => d.ref),
      ...tradesSnapshot.docs.map((d) => d.ref),
      draftDoc.ref,
    ];

    const BATCH_SIZE = 499;
    for (let i = 0; i < allRefs.length; i += BATCH_SIZE) {
      const batch = adminDb.batch();
      for (const ref of allRefs.slice(i, i + BATCH_SIZE)) {
        batch.delete(ref);
      }
      await batch.commit();
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Failed to delete draft:', err);
    return NextResponse.json(
      { error: 'Failed to delete draft' },
      { status: 500 },
    );
  }
}
