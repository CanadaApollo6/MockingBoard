import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getSessionUser } from '@/lib/firebase/auth-session';
import { adminDb } from '@/lib/firebase/firebase-admin';
import { getBigBoard } from '@/lib/firebase/data';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ boardId: string }> },
) {
  const { boardId } = await params;
  const board = await getBigBoard(boardId);

  if (!board) {
    return NextResponse.json({ error: 'Board not found' }, { status: 404 });
  }

  if (board.visibility !== 'public') {
    const session = await getSessionUser();
    if (!session || session.uid !== board.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  return NextResponse.json({ board });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ boardId: string }> },
) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { boardId } = await params;
  const board = await getBigBoard(boardId);

  if (!board) {
    return NextResponse.json({ error: 'Board not found' }, { status: 404 });
  }

  if (board.userId !== session.uid) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: {
    rankings?: string[];
    name?: string;
    customPlayers?: Array<{
      id: string;
      name: string;
      position: string;
      school: string;
      note?: string;
    }>;
    visibility?: 'private' | 'public';
    slug?: string;
    description?: string;
    grades?: Record<string, number>;
    preferredGradeSystem?: string;
    positionRankings?: Record<string, string[]>;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 },
    );
  }

  const VALID_VISIBILITY = new Set(['private', 'public']);
  const VALID_GRADE_SYSTEM = new Set(['tier', 'nfl', 'letter', 'projection']);

  if (body.visibility && !VALID_VISIBILITY.has(body.visibility)) {
    return NextResponse.json({ error: 'Invalid visibility' }, { status: 400 });
  }
  if (
    body.preferredGradeSystem &&
    !VALID_GRADE_SYSTEM.has(body.preferredGradeSystem)
  ) {
    return NextResponse.json(
      { error: 'Invalid grade system' },
      { status: 400 },
    );
  }

  if (body.slug !== undefined) {
    const existing = await adminDb
      .collection('bigBoards')
      .where('slug', '==', body.slug)
      .limit(1)
      .get();

    const taken = existing.docs.some((doc) => doc.id !== boardId);
    if (taken) {
      return NextResponse.json(
        { error: 'Slug is already in use' },
        { status: 409 },
      );
    }
  }

  try {
    const updates: Record<string, unknown> = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (body.rankings !== undefined) updates.rankings = body.rankings;
    if (body.name !== undefined) updates.name = body.name;
    if (body.customPlayers !== undefined)
      updates.customPlayers = body.customPlayers;
    if (body.visibility !== undefined) updates.visibility = body.visibility;
    if (body.slug !== undefined) updates.slug = body.slug;
    if (body.description !== undefined) updates.description = body.description;
    if (body.grades !== undefined) updates.grades = body.grades;
    if (body.preferredGradeSystem !== undefined)
      updates.preferredGradeSystem = body.preferredGradeSystem;
    if (body.positionRankings !== undefined)
      updates.positionRankings = body.positionRankings;

    await adminDb.collection('bigBoards').doc(boardId).update(updates);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Failed to update board:', err);
    return NextResponse.json(
      { error: 'Failed to update board' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ boardId: string }> },
) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { boardId } = await params;
  const board = await getBigBoard(boardId);

  if (!board) {
    return NextResponse.json({ error: 'Board not found' }, { status: 404 });
  }

  if (board.userId !== session.uid) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    await adminDb.collection('bigBoards').doc(boardId).delete();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Failed to delete board:', err);
    return NextResponse.json(
      { error: 'Failed to delete board' },
      { status: 500 },
    );
  }
}
