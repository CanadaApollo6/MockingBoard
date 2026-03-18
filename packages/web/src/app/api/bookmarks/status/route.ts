import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/firebase/auth-session';
import { adminDb } from '@/lib/firebase/firebase-admin';

const VALID_TYPES = new Set(['board', 'report']);

export async function GET(request: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ bookmarkedIds: [] });
  }

  const { searchParams } = new URL(request.url);
  const idsParam = searchParams.get('ids');
  const targetType = searchParams.get('targetType');

  if (!idsParam || !targetType || !VALID_TYPES.has(targetType)) {
    return NextResponse.json({ bookmarkedIds: [] });
  }

  const ids = idsParam.split(',').filter(Boolean).slice(0, 50);
  if (ids.length === 0) {
    return NextResponse.json({ bookmarkedIds: [] });
  }

  try {
    const refs = ids.map((id) =>
      adminDb.collection('bookmarks').doc(`${session.uid}_${targetType}_${id}`),
    );
    const docs = await adminDb.getAll(...refs);

    const bookmarkedIds = docs
      .filter((doc) => doc.exists)
      .map((doc) => doc.data()!.targetId as string);

    return NextResponse.json({ bookmarkedIds });
  } catch (err) {
    console.error('Failed to fetch bookmark status:', err);
    return NextResponse.json({ bookmarkedIds: [] });
  }
}
