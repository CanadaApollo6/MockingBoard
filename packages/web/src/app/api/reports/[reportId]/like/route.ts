import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getSessionUser } from '@/lib/firebase/auth-session';
import { adminDb } from '@/lib/firebase/firebase-admin';
import { notifyReportLiked } from '@/lib/notifications';
import { fanOutActivity } from '@/lib/activity';

interface RouteParams {
  params: Promise<{ reportId: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const { reportId } = await params;
  const session = await getSessionUser();

  if (!session) {
    // Unauthenticated users get count only
    const countSnap = await adminDb
      .collection('reportLikes')
      .where('reportId', '==', reportId)
      .count()
      .get();

    return NextResponse.json({
      isLiked: false,
      likeCount: countSnap.data().count,
    });
  }

  const docId = `${session.uid}_${reportId}`;
  const likeDoc = await adminDb.collection('reportLikes').doc(docId).get();
  const reportDoc = await adminDb
    .collection('scoutingReports')
    .doc(reportId)
    .get();

  return NextResponse.json({
    isLiked: likeDoc.exists,
    likeCount: reportDoc.data()?.likeCount ?? 0,
  });
}

export async function POST(_request: Request, { params }: RouteParams) {
  const { reportId } = await params;
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const docId = `${session.uid}_${reportId}`;
  const reportRef = adminDb.collection('scoutingReports').doc(reportId);
  const likeRef = adminDb.collection('reportLikes').doc(docId);

  try {
    const result = await adminDb.runTransaction(async (transaction) => {
      const reportDoc = await transaction.get(reportRef);
      if (!reportDoc.exists) throw new Error('Report not found');

      const existingLike = await transaction.get(likeRef);
      if (existingLike.exists) return null; // Already liked

      transaction.set(likeRef, {
        reportId,
        userId: session.uid,
        createdAt: FieldValue.serverTimestamp(),
      });

      transaction.update(reportRef, {
        likeCount: FieldValue.increment(1),
      });

      const data = reportDoc.data()!;
      return {
        authorId: data.authorId as string,
        authorName: data.authorName as string,
        playerId: data.playerId as string,
      };
    });

    if (result) {
      // Notify author (fire-and-forget, don't notify yourself)
      if (result.authorId !== session.uid) {
        const likerName = session.name ?? session.email ?? 'Someone';
        notifyReportLiked(
          result.authorId,
          likerName,
          result.authorName,
          reportId,
        ).catch(() => {});
      }

      // Fan out activity to followers (look up player name)
      adminDb
        .collection('players')
        .doc(result.playerId)
        .get()
        .then((playerDoc) => {
          const playerName = playerDoc.data()?.name ?? 'a prospect';
          return fanOutActivity({
            actorId: session.uid,
            type: 'report-liked',
            targetId: reportId,
            targetName: playerName,
            targetLink: `/reports/${reportId}`,
          });
        })
        .catch(() => {});
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to like report';
    const status = message === 'Report not found' ? 404 : 500;
    if (status === 500) console.error('Failed to like report:', err);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { reportId } = await params;
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const docId = `${session.uid}_${reportId}`;
  const reportRef = adminDb.collection('scoutingReports').doc(reportId);
  const likeRef = adminDb.collection('reportLikes').doc(docId);

  try {
    await adminDb.runTransaction(async (transaction) => {
      const existingLike = await transaction.get(likeRef);
      if (!existingLike.exists) return; // Not liked

      transaction.delete(likeRef);
      transaction.update(reportRef, {
        likeCount: FieldValue.increment(-1),
      });
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Failed to unlike report:', err);
    return NextResponse.json(
      { error: 'Failed to unlike report' },
      { status: 500 },
    );
  }
}
