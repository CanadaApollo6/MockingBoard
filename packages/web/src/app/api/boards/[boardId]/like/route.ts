import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getSessionUser } from '@/lib/firebase/auth-session';
import { adminDb } from '@/lib/firebase/firebase-admin';
import { notifyBoardLiked } from '@/lib/notifications';
import { fanOutActivity } from '@/lib/activity';

interface RouteParams {
  params: Promise<{ boardId: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const { boardId } = await params;
  const session = await getSessionUser();

  if (!session) {
    // Unauthenticated users get count only
    const countSnap = await adminDb
      .collection('boardLikes')
      .where('boardId', '==', boardId)
      .count()
      .get();

    return NextResponse.json({
      isLiked: false,
      likeCount: countSnap.data().count,
    });
  }

  const docId = `${session.uid}_${boardId}`;
  const likeDoc = await adminDb.collection('boardLikes').doc(docId).get();
  const boardDoc = await adminDb.collection('bigBoards').doc(boardId).get();

  return NextResponse.json({
    isLiked: likeDoc.exists,
    likeCount: boardDoc.data()?.likeCount ?? 0,
  });
}

export async function POST(_request: Request, { params }: RouteParams) {
  const { boardId } = await params;
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const docId = `${session.uid}_${boardId}`;
  const boardRef = adminDb.collection('bigBoards').doc(boardId);
  const likeRef = adminDb.collection('boardLikes').doc(docId);

  try {
    const result = await adminDb.runTransaction(async (transaction) => {
      const boardDoc = await transaction.get(boardRef);
      if (!boardDoc.exists) throw new Error('Board not found');

      const existingLike = await transaction.get(likeRef);
      if (existingLike.exists) return null; // Already liked

      transaction.set(likeRef, {
        boardId,
        userId: session.uid,
        createdAt: FieldValue.serverTimestamp(),
      });

      transaction.update(boardRef, {
        likeCount: FieldValue.increment(1),
      });

      const data = boardDoc.data()!;
      return {
        userId: data.userId as string,
        name: data.name as string,
        slug: (data.slug ?? boardId) as string,
      };
    });

    if (result) {
      // Notify board author (fire-and-forget, don't notify yourself)
      if (result.userId !== session.uid) {
        const likerName = session.name ?? session.email ?? 'Someone';
        notifyBoardLiked(
          result.userId,
          likerName,
          result.name,
          result.slug,
        ).catch(() => {});
      }

      // Fan out activity to followers
      fanOutActivity({
        actorId: session.uid,
        type: 'board-liked',
        targetId: boardId,
        targetName: result.name,
        targetLink: `/boards/${result.slug}`,
      }).catch(() => {});
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to like board';
    const status = message === 'Board not found' ? 404 : 500;
    if (status === 500) console.error('Failed to like board:', err);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { boardId } = await params;
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const docId = `${session.uid}_${boardId}`;
  const boardRef = adminDb.collection('bigBoards').doc(boardId);
  const likeRef = adminDb.collection('boardLikes').doc(docId);

  try {
    await adminDb.runTransaction(async (transaction) => {
      const existingLike = await transaction.get(likeRef);
      if (!existingLike.exists) return; // Not liked

      transaction.delete(likeRef);
      transaction.update(boardRef, {
        likeCount: FieldValue.increment(-1),
      });
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Failed to unlike board:', err);
    return NextResponse.json(
      { error: 'Failed to unlike board' },
      { status: 500 },
    );
  }
}
