import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getSessionUser } from '@/lib/firebase/auth-session';
import { adminDb } from '@/lib/firebase/firebase-admin';
import { getUserLists } from '@/lib/firebase/data';
import { MAX_NAME_LENGTH, MAX_DESCRIPTION_LENGTH } from '@/lib/validation';

export async function GET() {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const lists = await getUserLists(session.uid);
  return NextResponse.json({ lists });
}

export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: {
    name?: string;
    description?: string;
    items?: Array<{ type: string; id: string; note?: string }>;
    visibility?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 },
    );
  }

  if (!body.name || body.name.trim().length === 0) {
    return NextResponse.json(
      { error: 'List name is required' },
      { status: 400 },
    );
  }

  if (body.name.length > MAX_NAME_LENGTH) {
    return NextResponse.json(
      { error: `Name must be ${MAX_NAME_LENGTH} characters or less` },
      { status: 400 },
    );
  }

  if (body.description && body.description.length > MAX_DESCRIPTION_LENGTH) {
    return NextResponse.json(
      {
        error: `Description must be ${MAX_DESCRIPTION_LENGTH} characters or less`,
      },
      { status: 400 },
    );
  }

  // Resolve author name
  const userDoc = await adminDb.collection('users').doc(session.uid).get();
  const authorName =
    userDoc.data()?.displayName ?? session.name ?? session.email ?? 'Anonymous';

  try {
    const ref = adminDb.collection('lists').doc();
    const listData = {
      userId: session.uid,
      authorName,
      name: body.name.trim(),
      description: body.description?.trim() ?? '',
      items: body.items ?? [],
      visibility: body.visibility === 'public' ? 'public' : 'private',
    };

    await ref.set({
      ...listData,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ id: ref.id, ...listData });
  } catch (err) {
    console.error('Failed to create list:', err);
    return NextResponse.json(
      { error: 'Failed to create list' },
      { status: 500 },
    );
  }
}
