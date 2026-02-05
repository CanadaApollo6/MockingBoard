import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getSessionUser } from '@/lib/auth-session';
import { adminDb } from '@/lib/firebase-admin';
import { getUserBoards } from '@/lib/data';
import { generateDraftName } from '@mockingboard/shared';

export async function GET() {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const boards = await getUserBoards(session.uid);
  return NextResponse.json({ boards });
}

export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: {
    year: number;
    basedOn: 'consensus' | 'blank';
    name?: string;
    rankings?: string[];
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 },
    );
  }

  const { year, basedOn, name, rankings } = body;

  if (!year || !basedOn) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 },
    );
  }

  try {
    const ref = adminDb.collection('bigBoards').doc();
    const boardData = {
      userId: session.uid,
      name: name || generateDraftName(),
      year,
      basedOn,
      rankings: rankings ?? [],
      customPlayers: [] as unknown[],
    };

    await ref.set({
      ...boardData,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ id: ref.id, ...boardData });
  } catch (err) {
    console.error('Failed to create board:', err);
    return NextResponse.json(
      { error: 'Failed to create board' },
      { status: 500 },
    );
  }
}
