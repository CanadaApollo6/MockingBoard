import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getSessionUser } from '@/lib/firebase/auth-session';
import { adminDb } from '@/lib/firebase/firebase-admin';
import { sanitize } from '@/lib/firebase/sanitize';
import { fanOutActivity } from '@/lib/activity';
import { notifyWatchedProspectReport } from '@/lib/notifications';
import {
  MAX_REPORT_CONTENT_LENGTH,
  MAX_NOTE_LENGTH,
  MAX_COMPARISON_LENGTH,
  MAX_STRENGTH_LENGTH,
  MAX_ARRAY_ITEMS,
} from '@/lib/validation';
import type { ScoutingReport } from '@mockingboard/shared';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const playerId = searchParams.get('playerId');
  const authorId = searchParams.get('authorId');
  const sort = searchParams.get('sort');

  if (!playerId && !authorId) {
    return NextResponse.json(
      { error: 'Missing required query param: playerId or authorId' },
      { status: 400 },
    );
  }

  try {
    const orderField = sort === 'likes' && playerId ? 'likeCount' : 'createdAt';
    const orderDir = 'desc' as const;

    let query = adminDb
      .collection('scoutingReports')
      .orderBy(orderField, orderDir)
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
    gradeSystem?: string;
    comparison?: string;
    strengths?: string[];
    weaknesses?: string[];
    content?: Record<string, unknown>;
    contentText?: string;
    note?: string;
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

  if (body.contentText && body.contentText.length > MAX_REPORT_CONTENT_LENGTH) {
    return NextResponse.json(
      {
        error: `Report content must be ${MAX_REPORT_CONTENT_LENGTH} characters or less`,
      },
      { status: 400 },
    );
  }

  if (body.note && body.note.length > MAX_NOTE_LENGTH) {
    return NextResponse.json(
      { error: `Note must be ${MAX_NOTE_LENGTH} characters or less` },
      { status: 400 },
    );
  }

  if (body.comparison && body.comparison.length > MAX_COMPARISON_LENGTH) {
    return NextResponse.json(
      {
        error: `Comparison must be ${MAX_COMPARISON_LENGTH} characters or less`,
      },
      { status: 400 },
    );
  }

  if (body.strengths && body.strengths.length > MAX_ARRAY_ITEMS) {
    return NextResponse.json(
      { error: `Too many strengths (max ${MAX_ARRAY_ITEMS})` },
      { status: 400 },
    );
  }

  if (body.weaknesses && body.weaknesses.length > MAX_ARRAY_ITEMS) {
    return NextResponse.json(
      { error: `Too many weaknesses (max ${MAX_ARRAY_ITEMS})` },
      { status: 400 },
    );
  }

  const tooLong = (arr?: string[]) =>
    arr?.some((s) => s.length > MAX_STRENGTH_LENGTH);
  if (tooLong(body.strengths) || tooLong(body.weaknesses)) {
    return NextResponse.json(
      {
        error: `Each strength/weakness must be ${MAX_STRENGTH_LENGTH} characters or less`,
      },
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
      if (body.gradeSystem !== undefined)
        updates.gradeSystem = body.gradeSystem;
      if (body.comparison !== undefined) updates.comparison = body.comparison;
      if (body.strengths !== undefined) updates.strengths = body.strengths;
      if (body.weaknesses !== undefined) updates.weaknesses = body.weaknesses;
      if (body.content !== undefined) updates.content = body.content;
      if (body.contentText !== undefined)
        updates.contentText = body.contentText;
      if (body.note !== undefined) updates.note = body.note;

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
      gradeSystem: body.gradeSystem ?? null,
      comparison: body.comparison ?? null,
      strengths: body.strengths ?? [],
      weaknesses: body.weaknesses ?? [],
      content: body.content ?? null,
      contentText: body.contentText ?? null,
      note: body.note ?? null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    await ref.set(report);

    // Fan out activity + notify watchers (fire-and-forget)
    adminDb
      .collection('players')
      .doc(playerId)
      .get()
      .then(async (playerDoc) => {
        const playerName = playerDoc.data()?.name ?? 'a prospect';

        await fanOutActivity({
          actorId: session.uid,
          type: 'report-created',
          targetId: ref.id,
          targetName: playerName,
          targetLink: `/reports/${ref.id}`,
        });

        // Notify users watching this prospect
        const watchers = await adminDb
          .collection('watchlistItems')
          .where('playerId', '==', playerId)
          .get();

        await Promise.all(
          watchers.docs
            .filter((doc) => doc.data().userId !== session.uid)
            .map((doc) =>
              notifyWatchedProspectReport(
                doc.data().userId,
                playerName,
                playerId,
                authorName,
              ),
            ),
        );
      })
      .catch(() => {});

    return NextResponse.json({ reportId: ref.id });
  } catch (err) {
    console.error('Failed to create report:', err);
    return NextResponse.json(
      { error: 'Failed to create report' },
      { status: 500 },
    );
  }
}
