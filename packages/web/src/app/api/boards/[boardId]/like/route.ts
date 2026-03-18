import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getSessionUser } from '@/lib/firebase/auth-session';
import { adminDb } from '@/lib/firebase/firebase-admin';
import { handleLikeGet, handleLikeDelete } from '@/lib/api/likes';
import { notifyBoardLiked } from '@/lib/notifications';
import { fanOutActivity } from '@/lib/activity';

const LIKE_CONFIG = {
  likeCollection: 'boardLikes',
  resourceCollection: 'bigBoards',
  resourceKey: 'boardId',
  label: 'Board',
} as const;

interface RouteParams {
  params: Promise<{ boardId: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { boardId } = await params;
  return handleLikeGet(boardId, LIKE_CONFIG);
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
      if (existingLike.exists) return null;

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

    if (result && result.userId !== session.uid) {
      const likerName = session.name ?? session.email ?? 'Someone';
      notifyBoardLiked(
        result.userId,
        likerName,
        result.name,
        result.slug,
      ).catch(() => {});
    }

    if (result) {
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
  return handleLikeDelete(boardId, LIKE_CONFIG);
}
