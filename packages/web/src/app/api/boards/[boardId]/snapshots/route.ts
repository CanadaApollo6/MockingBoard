import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getSessionUser } from '@/lib/firebase/auth-session';
import { adminDb } from '@/lib/firebase/firebase-admin';
import { getBigBoard } from '@/lib/firebase/data';

export async function POST(
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

  let body: { label?: string };
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  try {
    const ref = adminDb
      .collection('bigBoards')
      .doc(boardId)
      .collection('snapshots')
      .doc();

    const snapshot = {
      rankings: board.rankings,
      label: body.label?.trim() || null,
      createdAt: FieldValue.serverTimestamp(),
    };

    await ref.set(snapshot);

    return NextResponse.json({ snapshotId: ref.id });
  } catch (err) {
    console.error('Failed to create snapshot:', err);
    return NextResponse.json(
      { error: 'Failed to create snapshot' },
      { status: 500 },
    );
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ boardId: string }> },
) {
  const { boardId } = await params;

  try {
    const snap = await adminDb
      .collection('bigBoards')
      .doc(boardId)
      .collection('snapshots')
      .orderBy('createdAt', 'desc')
      .get();

    const snapshots = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ snapshots });
  } catch (err) {
    console.error('Failed to fetch snapshots:', err);
    return NextResponse.json(
      { error: 'Failed to fetch snapshots' },
      { status: 500 },
    );
  }
}
