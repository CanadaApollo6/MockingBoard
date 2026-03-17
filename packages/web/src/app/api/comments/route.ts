import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getSessionUser } from '@/lib/firebase/auth-session';
import { adminDb } from '@/lib/firebase/firebase-admin';
import { notifyNewComment } from '@/lib/notifications';
import { fanOutActivity } from '@/lib/activity';
import { sanitize } from '@/lib/firebase/sanitize';
import type { Comment } from '@mockingboard/shared';

const MAX_COMMENT_LENGTH = 500;
const VALID_TARGET_TYPES = ['board', 'report'] as const;

function getParentCollection(targetType: 'board' | 'report') {
  return targetType === 'board' ? 'bigBoards' : 'scoutingReports';
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const targetId = searchParams.get('targetId');
  const targetType = searchParams.get('targetType') as
    | 'board'
    | 'report'
    | null;

  if (!targetId || !targetType || !VALID_TARGET_TYPES.includes(targetType)) {
    return NextResponse.json(
      { error: 'targetId and targetType (board|report) are required' },
      { status: 400 },
    );
  }

  const snapshot = await adminDb
    .collection('comments')
    .where('targetId', '==', targetId)
    .where('targetType', '==', targetType)
    .orderBy('createdAt', 'desc')
    .limit(50)
    .get();

  const comments: Comment[] = sanitize(
    snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Comment),
  );

  return NextResponse.json({ comments });
}

export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { targetId, targetType, text } = body as {
    targetId?: string;
    targetType?: string;
    text?: string;
  };

  if (
    !targetId ||
    !targetType ||
    !VALID_TARGET_TYPES.includes(targetType as 'board' | 'report')
  ) {
    return NextResponse.json(
      { error: 'targetId and targetType (board|report) are required' },
      { status: 400 },
    );
  }

  if (!text || text.trim().length === 0) {
    return NextResponse.json(
      { error: 'Comment text is required' },
      { status: 400 },
    );
  }

  if (text.length > MAX_COMMENT_LENGTH) {
    return NextResponse.json(
      { error: `Comment must be ${MAX_COMMENT_LENGTH} characters or less` },
      { status: 400 },
    );
  }

  const validTargetType = targetType as 'board' | 'report';
  const parentCollection = getParentCollection(validTargetType);
  const parentRef = adminDb.collection(parentCollection).doc(targetId);

  try {
    const result = await adminDb.runTransaction(async (transaction) => {
      const parentDoc = await transaction.get(parentRef);
      if (!parentDoc.exists) throw new Error('Content not found');

      const userDoc = await transaction.get(
        adminDb.collection('users').doc(session.uid),
      );
      const userData = userDoc.data();
      const authorName =
        userData?.displayName ?? session.name ?? session.email ?? 'Anonymous';
      const authorSlug = (userData?.slug as string) ?? undefined;

      const commentRef = adminDb.collection('comments').doc();
      const commentData = {
        targetId,
        targetType: validTargetType,
        authorId: session.uid,
        authorName,
        authorSlug: authorSlug ?? null,
        text: text.trim(),
        createdAt: FieldValue.serverTimestamp(),
      };

      transaction.set(commentRef, commentData);
      transaction.update(parentRef, {
        commentCount: FieldValue.increment(1),
      });

      const parentData = parentDoc.data()!;
      return {
        commentId: commentRef.id,
        authorName,
        authorSlug,
        contentOwnerId: (parentData.userId ?? parentData.authorId) as string,
        contentName: (parentData.name ??
          parentData.contentText ??
          'content') as string,
        contentSlug: (parentData.slug ?? targetId) as string,
      };
    });

    // Notify content owner (fire-and-forget, don't notify yourself)
    if (result.contentOwnerId !== session.uid) {
      const notifType =
        validTargetType === 'board' ? 'board-commented' : 'report-commented';
      const contentLink =
        validTargetType === 'board'
          ? `/boards/${result.contentSlug}`
          : `/players/${targetId}`;

      notifyNewComment(
        result.contentOwnerId,
        result.authorName,
        result.contentName,
        contentLink,
        notifType,
      ).catch(() => {});
    }

    // Fan out activity to followers
    const activityType =
      validTargetType === 'board' ? 'board-commented' : 'report-commented';
    const activityLink =
      validTargetType === 'board'
        ? `/boards/${result.contentSlug}`
        : `/players/${targetId}`;

    fanOutActivity({
      actorId: session.uid,
      type: activityType,
      targetId,
      targetName: result.contentName,
      targetLink: activityLink,
    }).catch(() => {});

    return NextResponse.json({
      comment: {
        id: result.commentId,
        targetId,
        targetType: validTargetType,
        authorId: session.uid,
        authorName: result.authorName,
        authorSlug: result.authorSlug ?? undefined,
        text: text.trim(),
        createdAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 },
      } satisfies Comment,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to create comment';
    const status = message === 'Content not found' ? 404 : 500;
    if (status === 500) console.error('Failed to create comment:', err);
    return NextResponse.json({ error: message }, { status });
  }
}
