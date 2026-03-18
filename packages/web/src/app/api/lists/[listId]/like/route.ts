import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getSessionUser } from '@/lib/firebase/auth-session';
import { adminDb } from '@/lib/firebase/firebase-admin';

interface RouteParams {
  params: Promise<{ listId: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const { listId } = await params;
  const session = await getSessionUser();

  if (!session) {
    const countSnap = await adminDb
      .collection('listLikes')
      .where('listId', '==', listId)
      .count()
      .get();

    return NextResponse.json({
      isLiked: false,
      likeCount: countSnap.data().count,
    });
  }

  const docId = `${session.uid}_${listId}`;
  const likeDoc = await adminDb.collection('listLikes').doc(docId).get();
  const listDoc = await adminDb.collection('lists').doc(listId).get();

  return NextResponse.json({
    isLiked: likeDoc.exists,
    likeCount: listDoc.data()?.likeCount ?? 0,
  });
}

export async function POST(_request: Request, { params }: RouteParams) {
  const { listId } = await params;
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const docId = `${session.uid}_${listId}`;
  const listRef = adminDb.collection('lists').doc(listId);
  const likeRef = adminDb.collection('listLikes').doc(docId);

  try {
    await adminDb.runTransaction(async (transaction) => {
      const listDoc = await transaction.get(listRef);
      if (!listDoc.exists) throw new Error('List not found');

      const existingLike = await transaction.get(likeRef);
      if (existingLike.exists) return;

      transaction.set(likeRef, {
        listId,
        userId: session.uid,
        createdAt: FieldValue.serverTimestamp(),
      });

      transaction.update(listRef, {
        likeCount: FieldValue.increment(1),
      });
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to like list';
    const status = message === 'List not found' ? 404 : 500;
    if (status === 500) console.error('Failed to like list:', err);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { listId } = await params;
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const docId = `${session.uid}_${listId}`;
  const listRef = adminDb.collection('lists').doc(listId);
  const likeRef = adminDb.collection('listLikes').doc(docId);

  try {
    await adminDb.runTransaction(async (transaction) => {
      const existingLike = await transaction.get(likeRef);
      if (!existingLike.exists) return;

      transaction.delete(likeRef);
      transaction.update(listRef, {
        likeCount: FieldValue.increment(-1),
      });
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Failed to unlike list:', err);
    return NextResponse.json(
      { error: 'Failed to unlike list' },
      { status: 500 },
    );
  }
}
