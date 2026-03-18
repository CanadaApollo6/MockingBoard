import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/firebase/auth-session';
import { adminDb } from '@/lib/firebase/firebase-admin';

export async function GET(request: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ likedIds: [] });
  }

  const { searchParams } = new URL(request.url);
  const idsParam = searchParams.get('ids');
  if (!idsParam) {
    return NextResponse.json({ likedIds: [] });
  }

  const listIds = idsParam.split(',').filter(Boolean).slice(0, 50);
  if (listIds.length === 0) {
    return NextResponse.json({ likedIds: [] });
  }

  try {
    const docIds = listIds.map((id) => `${session.uid}_${id}`);
    const refs = docIds.map((id) => adminDb.collection('listLikes').doc(id));
    const docs = await adminDb.getAll(...refs);

    const likedIds = docs
      .filter((doc) => doc.exists)
      .map((doc) => doc.data()!.listId as string);

    return NextResponse.json({ likedIds });
  } catch (err) {
    console.error('Failed to fetch list like status:', err);
    return NextResponse.json({ likedIds: [] });
  }
}
