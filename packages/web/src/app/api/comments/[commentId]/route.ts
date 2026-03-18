import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getSessionUser } from '@/lib/firebase/auth-session';
import { adminDb } from '@/lib/firebase/firebase-admin';

interface RouteParams {
  params: Promise<{ commentId: string }>;
}

function getParentCollection(targetType: string) {
  return targetType === 'board' ? 'bigBoards' : 'scoutingReports';
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { commentId } = await params;
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const commentRef = adminDb.collection('comments').doc(commentId);

  try {
    await adminDb.runTransaction(async (transaction) => {
      const commentDoc = await transaction.get(commentRef);
      if (!commentDoc.exists) throw new Error('Comment not found');

      const comment = commentDoc.data()!;
      const parentCollection = getParentCollection(
        comment.targetType as string,
      );
      const parentRef = adminDb
        .collection(parentCollection)
        .doc(comment.targetId as string);
      const parentDoc = await transaction.get(parentRef);

      // Only comment author or content owner can delete
      const isCommentAuthor = comment.authorId === session.uid;
      const isContentOwner =
        parentDoc.exists &&
        (parentDoc.data()?.userId === session.uid ||
          parentDoc.data()?.authorId === session.uid);

      if (!isCommentAuthor && !isContentOwner) {
        throw new Error('Forbidden');
      }

      transaction.delete(commentRef);
      if (parentDoc.exists) {
        transaction.update(parentRef, {
          commentCount: FieldValue.increment(-1),
        });
      }
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to delete comment';
    if (message === 'Comment not found') {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    if (message === 'Forbidden') {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    console.error('Failed to delete comment:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
