import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getSessionUser } from '@/lib/auth-session';
import { adminDb } from '@/lib/firebase-admin';
import { sanitize } from '@/lib/sanitize';
import type { ScoutingReport } from '@mockingboard/shared';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const playerId = searchParams.get('playerId');
  const authorId = searchParams.get('authorId');

  if (!playerId && !authorId) {
    return NextResponse.json(
      { error: 'Missing required query param: playerId or authorId' },
      { status: 400 },
    );
  }

  try {
    let query = adminDb
      .collection('scoutingReports')
      .orderBy('createdAt', 'desc')
      .limit(50);

    if (playerId) {
      query = query.where('playerId', '==', playerId);
    } else {
      query = query.where('authorId', '==', authorId);
    }

    const snap = await query.get();
    const reports: ScoutingReport[] = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as ScoutingReport[];

    return NextResponse.json({ reports: sanitize(reports) });
  } catch (err) {
    console.error('Failed to fetch reports:', err);
    return NextResponse.json(
      { error: 'Failed to fetch reports' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: {
    playerId: string;
    year: number;
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

  const { playerId, year } = body;

  if (!playerId || !year) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 },
    );
  }

  try {
    // Upsert: check for existing report by this user for this player+year
    const existing = await adminDb
      .collection('scoutingReports')
      .where('playerId', '==', playerId)
      .where('authorId', '==', session.uid)
      .where('year', '==', year)
      .limit(1)
      .get();

    if (!existing.empty) {
      const doc = existing.docs[0];
      const updates: Record<string, unknown> = {
        updatedAt: FieldValue.serverTimestamp(),
      };

      if (body.grade !== undefined) updates.grade = body.grade;
      if (body.comparison !== undefined) updates.comparison = body.comparison;
      if (body.strengths !== undefined) updates.strengths = body.strengths;
      if (body.weaknesses !== undefined) updates.weaknesses = body.weaknesses;
      if (body.content !== undefined) updates.content = body.content;
      if (body.contentText !== undefined)
        updates.contentText = body.contentText;

      await doc.ref.update(updates);
      return NextResponse.json({ reportId: doc.id });
    }

    // New report — fetch author display name
    const userDoc = await adminDb.collection('users').doc(session.uid).get();
    const authorName =
      userDoc.data()?.displayName ?? userDoc.data()?.name ?? 'Unknown';

    const ref = adminDb.collection('scoutingReports').doc();
    const report = {
      playerId,
      authorId: session.uid,
      authorName,
      year,
      grade: body.grade ?? null,
      comparison: body.comparison ?? null,
      strengths: body.strengths ?? [],
      weaknesses: body.weaknesses ?? [],
      content: body.content ?? null,
      contentText: body.contentText ?? null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    await ref.set(report);
    return NextResponse.json({ reportId: ref.id });
  } catch (err) {
    console.error('Failed to create report:', err);
    return NextResponse.json(
      { error: 'Failed to create report' },
      { status: 500 },
    );
  }
}
