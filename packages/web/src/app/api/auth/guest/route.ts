import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getSessionUser } from '@/lib/auth-session';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { displayName: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 },
    );
  }

  const { displayName } = body;
  if (!displayName || typeof displayName !== 'string') {
    return NextResponse.json(
      { error: 'displayName is required' },
      { status: 400 },
    );
  }

  const name = displayName.trim().slice(0, 32);
  if (!name) {
    return NextResponse.json(
      { error: 'displayName cannot be empty' },
      { status: 400 },
    );
  }

  try {
    const now = FieldValue.serverTimestamp();
    await adminDb.collection('users').doc(session.uid).set(
      {
        displayName: name,
        isGuest: true,
        createdAt: now,
        updatedAt: now,
      },
      { merge: true },
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Failed to create guest user:', err);
    return NextResponse.json(
      { error: 'Failed to create guest profile' },
      { status: 500 },
    );
  }
}
