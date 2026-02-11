import { NextResponse } from 'next/server';
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
      adminDb.collection('drafts').doc(draftId),
    ];

    const BATCH_SIZE = 499;
    for (let i = 0; i < allRefs.length; i += BATCH_SIZE) {
      const batch = adminDb.batch();
      for (const ref of allRefs.slice(i, i + BATCH_SIZE)) {
        batch.delete(ref);
      }
      await batch.commit();
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('Failed to delete draft:', err);
    return NextResponse.json(
      { error: 'Failed to delete draft' },
      { status: 500 },
    );
  }
}
