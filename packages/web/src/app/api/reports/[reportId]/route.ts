import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getSessionUser } from '@/lib/auth-session';
import { adminDb } from '@/lib/firebase-admin';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ reportId: string }> },
) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { reportId } = await params;
  const doc = await adminDb.collection('scoutingReports').doc(reportId).get();

  if (!doc.exists) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 });
  }

  if (doc.data()?.authorId !== session.uid) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: {
    grade?: number;
    comparison?: string;
    strengths?: string[];
    weaknesses?: string[];
    content?: Record<string, unknown>;
    contentText?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 },
    );
  }

  try {
    const updates: Record<string, unknown> = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (body.grade !== undefined) updates.grade = body.grade;
    if (body.comparison !== undefined) updates.comparison = body.comparison;
    if (body.strengths !== undefined) updates.strengths = body.strengths;
    if (body.weaknesses !== undefined) updates.weaknesses = body.weaknesses;
    if (body.content !== undefined) updates.content = body.content;
    if (body.contentText !== undefined) updates.contentText = body.contentText;

    await adminDb.collection('scoutingReports').doc(reportId).update(updates);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Failed to update report:', err);
    return NextResponse.json(
      { error: 'Failed to update report' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ reportId: string }> },
) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { reportId } = await params;
  const doc = await adminDb.collection('scoutingReports').doc(reportId).get();

  if (!doc.exists) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 });
  }

  if (doc.data()?.authorId !== session.uid) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    await adminDb.collection('scoutingReports').doc(reportId).delete();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Failed to delete report:', err);
    return NextResponse.json(
      { error: 'Failed to delete report' },
      { status: 500 },
    );
  }
}
