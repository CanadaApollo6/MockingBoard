import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getSessionUser } from '@/lib/firebase/auth-session';
import { adminDb } from '@/lib/firebase/firebase-admin';
import { handleLikeGet, handleLikeDelete } from '@/lib/api/likes';
import { notifyReportLiked } from '@/lib/notifications';
import { fanOutActivity } from '@/lib/activity';

const LIKE_CONFIG = {
  likeCollection: 'reportLikes',
  resourceCollection: 'scoutingReports',
  resourceKey: 'reportId',
  label: 'Report',
} as const;

interface RouteParams {
  params: Promise<{ reportId: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { reportId } = await params;
  return handleLikeGet(reportId, LIKE_CONFIG);
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
      if (existingLike.exists) return null;

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

    if (result && result.authorId !== session.uid) {
      const likerName = session.name ?? session.email ?? 'Someone';
      notifyReportLiked(
        result.authorId,
        likerName,
        result.authorName,
        reportId,
      ).catch(() => {});
    }

    if (result) {
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
  return handleLikeDelete(reportId, LIKE_CONFIG);
}
