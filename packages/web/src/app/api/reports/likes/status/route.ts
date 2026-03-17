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

  const reportIds = idsParam.split(',').filter(Boolean).slice(0, 50);
  if (reportIds.length === 0) {
    return NextResponse.json({ likedIds: [] });
  }

  try {
    // Check which reports the current user has liked
    const docIds = reportIds.map((id) => `${session.uid}_${id}`);
    const refs = docIds.map((id) => adminDb.collection('reportLikes').doc(id));
    const docs = await adminDb.getAll(...refs);

    const likedIds = docs
      .filter((doc) => doc.exists)
      .map((doc) => doc.data()!.reportId as string);

    return NextResponse.json({ likedIds });
  } catch (err) {
    console.error('Failed to fetch like status:', err);
    return NextResponse.json({ likedIds: [] });
  }
}
