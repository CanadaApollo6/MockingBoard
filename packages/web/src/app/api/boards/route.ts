import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getSessionUser } from '@/lib/firebase/auth-session';
import { adminDb } from '@/lib/firebase/firebase-admin';
import { getUserBoards } from '@/lib/firebase/data';
import { notifyNewBoard } from '@/lib/notifications';
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

    // Fire-and-forget: notify followers of new board
    adminDb
      .collection('follows')
      .where('followeeId', '==', session.uid)
      .limit(100)
      .get()
      .then(async (snap) => {
        if (snap.empty) return;
        const userDoc = await adminDb
          .collection('users')
          .doc(session.uid)
          .get();
        const authorName = userDoc.data()?.displayName ?? 'A scout';
        await Promise.all(
          snap.docs.map((doc) =>
            notifyNewBoard(
              doc.data().followerId,
              authorName,
              boardData.name,
              ref.id,
            ),
          ),
        );
      })
      .catch((err) => console.error('Board notification failed:', err));

    return NextResponse.json({ id: ref.id, ...boardData });
  } catch (err) {
    console.error('Failed to create board:', err);
    return NextResponse.json(
      { error: 'Failed to create board' },
      { status: 500 },
    );
  }
}
