import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getSessionUser } from '@/lib/firebase/auth-session';
import { adminDb } from '@/lib/firebase/firebase-admin';
import { getList } from '@/lib/firebase/data';

interface RouteParams {
  params: Promise<{ listId: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { listId } = await params;
  const list = await getList(listId);

  if (!list) {
    return NextResponse.json({ error: 'List not found' }, { status: 404 });
  }

  if (list.visibility !== 'public') {
    const session = await getSessionUser();
    if (!session || session.uid !== list.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  return NextResponse.json({ list });
}

export async function PUT(request: Request, { params }: RouteParams) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { listId } = await params;
  const list = await getList(listId);

  if (!list) {
    return NextResponse.json({ error: 'List not found' }, { status: 404 });
  }

  if (list.userId !== session.uid) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: {
    name?: string;
    description?: string;
    items?: Array<{ type: string; id: string; note?: string }>;
    visibility?: string;
    slug?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 },
    );
  }

  // Slug uniqueness check
  if (body.slug !== undefined) {
    const existing = await adminDb
      .collection('lists')
      .where('slug', '==', body.slug)
      .limit(1)
      .get();

    const taken = existing.docs.some((doc) => doc.id !== listId);
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

    if (body.name !== undefined) updates.name = body.name.trim();
    if (body.description !== undefined)
      updates.description = body.description.trim();
    if (body.items !== undefined) updates.items = body.items;
    if (body.visibility !== undefined) updates.visibility = body.visibility;
    if (body.slug !== undefined) updates.slug = body.slug;

    await adminDb.collection('lists').doc(listId).update(updates);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Failed to update list:', err);
    return NextResponse.json(
      { error: 'Failed to update list' },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { listId } = await params;
  const list = await getList(listId);

  if (!list) {
    return NextResponse.json({ error: 'List not found' }, { status: 404 });
  }

  if (list.userId !== session.uid) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    await adminDb.collection('lists').doc(listId).delete();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Failed to delete list:', err);
    return NextResponse.json(
      { error: 'Failed to delete list' },
      { status: 500 },
    );
  }
}
