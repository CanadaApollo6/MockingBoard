import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getSessionUser } from '@/lib/firebase/auth-session';
import { adminDb } from '@/lib/firebase/firebase-admin';

interface LikeConfig {
  /** The Firestore collection for likes (e.g. 'boardLikes'). */
  likeCollection: string;
  /** The Firestore collection for the parent resource (e.g. 'bigBoards'). */
  resourceCollection: string;
  /** The foreign key field in the like document (e.g. 'boardId'). */
  resourceKey: string;
  /** Human-readable label for error messages (e.g. 'board'). */
  label: string;
}

export interface PostLikeResult {
  resourceData: FirebaseFirestore.DocumentData;
  resourceId: string;
  session: NonNullable<Awaited<ReturnType<typeof getSessionUser>>>;
}

/**
 * Handle GET for like status + count.
 * Unauthenticated users get count only.
 */
export async function handleLikeGet(
  resourceId: string,
  config: LikeConfig,
): Promise<NextResponse> {
  const session = await getSessionUser();

  if (!session) {
    const countSnap = await adminDb
      .collection(config.likeCollection)
      .where(config.resourceKey, '==', resourceId)
      .count()
      .get();

    return NextResponse.json({
      isLiked: false,
      likeCount: countSnap.data().count,
    });
  }

  const docId = `${session.uid}_${resourceId}`;
  const [likeDoc, resourceDoc] = await Promise.all([
    adminDb.collection(config.likeCollection).doc(docId).get(),
    adminDb.collection(config.resourceCollection).doc(resourceId).get(),
  ]);

  return NextResponse.json({
    isLiked: likeDoc.exists,
    likeCount: resourceDoc.data()?.likeCount ?? 0,
  });
}

/**
 * Handle POST to like a resource. Returns the resource data for
 * post-like callbacks (notifications, activity), or null if already liked.
 */
export async function handleLikePost(
  resourceId: string,
  config: LikeConfig,
): Promise<NextResponse> {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const docId = `${session.uid}_${resourceId}`;
  const resourceRef = adminDb
    .collection(config.resourceCollection)
    .doc(resourceId);
  const likeRef = adminDb.collection(config.likeCollection).doc(docId);

  try {
    await adminDb.runTransaction(async (transaction) => {
      const resourceDoc = await transaction.get(resourceRef);
      if (!resourceDoc.exists) throw new Error(`${config.label} not found`);

      const existingLike = await transaction.get(likeRef);
      if (existingLike.exists) return;

      transaction.set(likeRef, {
        [config.resourceKey]: resourceId,
        userId: session.uid,
        createdAt: FieldValue.serverTimestamp(),
      });

      transaction.update(resourceRef, {
        likeCount: FieldValue.increment(1),
      });
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : `Failed to like ${config.label}`;
    const status = message.includes('not found') ? 404 : 500;
    if (status === 500) console.error(`Failed to like ${config.label}:`, err);
    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * Handle DELETE to unlike a resource.
 */
export async function handleLikeDelete(
  resourceId: string,
  config: LikeConfig,
): Promise<NextResponse> {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const docId = `${session.uid}_${resourceId}`;
  const resourceRef = adminDb
    .collection(config.resourceCollection)
    .doc(resourceId);
  const likeRef = adminDb.collection(config.likeCollection).doc(docId);

  try {
    await adminDb.runTransaction(async (transaction) => {
      const existingLike = await transaction.get(likeRef);
      if (!existingLike.exists) return;

      transaction.delete(likeRef);
      transaction.update(resourceRef, {
        likeCount: FieldValue.increment(-1),
      });
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(`Failed to unlike ${config.label}:`, err);
    return NextResponse.json(
      { error: `Failed to unlike ${config.label}` },
      { status: 500 },
    );
  }
}
