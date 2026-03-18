import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getSessionUser } from '@/lib/firebase/auth-session';
import { adminDb } from '@/lib/firebase/firebase-admin';
import { rateLimit } from '@/lib/rate-limit';
import type { ReportReason, ReportableContentType } from '@mockingboard/shared';

const VALID_CONTENT_TYPES = new Set<ReportableContentType>([
  'comment',
  'scouting-report',
  'board',
  'list',
]);

const VALID_REASONS = new Set<ReportReason>([
  'spam',
  'harassment',
  'inappropriate',
  'other',
]);

const COLLECTION_MAP: Record<ReportableContentType, string> = {
  comment: 'comments',
  'scouting-report': 'scoutingReports',
  board: 'bigBoards',
  list: 'lists',
};

const MAX_REASON_TEXT = 200;

async function getContentInfo(
  contentType: ReportableContentType,
  contentId: string,
): Promise<{ authorId: string; authorName: string; contentPreview: string }> {
  const doc = await adminDb
    .collection(COLLECTION_MAP[contentType])
    .doc(contentId)
    .get();
  if (!doc.exists) throw new Error('Content not found');

  const data = doc.data()!;
  const authorId = (data.authorId ?? data.userId) as string;
  const authorName = (data.authorName ?? data.userName ?? 'Unknown') as string;
  const contentPreview = (data.text ??
    data.name ??
    data.contentText ??
    'No preview') as string;

  return { authorId, authorName, contentPreview };
}

export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!rateLimit(`report:${session.uid}`, 10, 15 * 60 * 1000)) {
    return NextResponse.json(
      { error: 'Too many reports. Try again later.' },
      { status: 429 },
    );
  }

  let body: {
    contentType?: string;
    contentId?: string;
    reason?: string;
    reasonText?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 },
    );
  }

  const { contentType, contentId, reason, reasonText } = body;

  if (
    !contentType ||
    !VALID_CONTENT_TYPES.has(contentType as ReportableContentType)
  ) {
    return NextResponse.json(
      { error: 'Invalid content type' },
      { status: 400 },
    );
  }
  if (!contentId) {
    return NextResponse.json(
      { error: 'Content ID is required' },
      { status: 400 },
    );
  }
  if (!reason || !VALID_REASONS.has(reason as ReportReason)) {
    return NextResponse.json({ error: 'Invalid reason' }, { status: 400 });
  }
  if (reason === 'other' && (!reasonText || reasonText.trim().length === 0)) {
    return NextResponse.json(
      { error: 'Please provide details for your report' },
      { status: 400 },
    );
  }
  if (reasonText && reasonText.length > MAX_REASON_TEXT) {
    return NextResponse.json(
      { error: `Details must be ${MAX_REASON_TEXT} characters or less` },
      { status: 400 },
    );
  }

  const validContentType = contentType as ReportableContentType;
  const validReason = reason as ReportReason;

  const reportDocId = `${session.uid}_${validContentType}_${contentId}`;
  const reportRef = adminDb.collection('contentReports').doc(reportDocId);

  try {
    const [existingReport, contentInfo] = await Promise.all([
      reportRef.get(),
      getContentInfo(validContentType, contentId),
    ]);

    if (existingReport.exists) {
      return NextResponse.json(
        { error: 'You have already reported this content' },
        { status: 409 },
      );
    }

    const { authorId, authorName, contentPreview } = contentInfo;

    if (authorId === session.uid) {
      return NextResponse.json(
        { error: 'You cannot report your own content' },
        { status: 400 },
      );
    }

    await reportRef.set({
      reporterId: session.uid,
      reporterName: session.name ?? session.email ?? 'Anonymous',
      contentType: validContentType,
      contentId,
      reason: validReason,
      reasonText: validReason === 'other' ? reasonText!.trim() : null,
      createdAt: FieldValue.serverTimestamp(),
    });

    const moderationDocId = `${validContentType}_${contentId}`;
    await adminDb
      .collection('moderation')
      .doc(moderationDocId)
      .set(
        {
          contentType: validContentType,
          contentId,
          contentPreview: contentPreview.slice(0, 200),
          authorId,
          authorName,
          status: 'pending',
          reportCount: FieldValue.increment(1),
          createdAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to submit report';
    const status = message === 'Content not found' ? 404 : 500;
    if (status === 500) console.error('Failed to submit report:', err);
    return NextResponse.json({ error: message }, { status });
  }
}
