import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getSessionUser } from '@/lib/firebase/auth-session';
import { adminDb } from '@/lib/firebase/firebase-admin';

const VALID_TYPES = new Set(['board', 'report', 'list']);

export async function GET(request: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const targetId = searchParams.get('targetId');
  const targetType = searchParams.get('targetType');

  if (!targetId || !targetType || !VALID_TYPES.has(targetType)) {
    return NextResponse.json(
      { error: 'targetId and targetType (board|report) required' },
      { status: 400 },
    );
  }

  const docId = `${session.uid}_${targetType}_${targetId}`;
  const doc = await adminDb.collection('bookmarks').doc(docId).get();

  return NextResponse.json({ isBookmarked: doc.exists });
}

export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { targetId, targetType } = body;

  if (!targetId || !targetType || !VALID_TYPES.has(targetType)) {
    return NextResponse.json(
      { error: 'targetId and targetType (board|report) required' },
      { status: 400 },
    );
  }

  const docId = `${session.uid}_${targetType}_${targetId}`;
  const ref = adminDb.collection('bookmarks').doc(docId);

  const existing = await ref.get();
  if (existing.exists) {
    return NextResponse.json({ ok: true });
  }

  await ref.set({
    targetId,
    targetType,
    userId: session.uid,
    createdAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const targetId = searchParams.get('targetId');
  const targetType = searchParams.get('targetType');

  if (!targetId || !targetType || !VALID_TYPES.has(targetType)) {
    return NextResponse.json(
      { error: 'targetId and targetType (board|report) required' },
      { status: 400 },
    );
  }

  const docId = `${session.uid}_${targetType}_${targetId}`;
  await adminDb.collection('bookmarks').doc(docId).delete();

  return NextResponse.json({ ok: true });
}
