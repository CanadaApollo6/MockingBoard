import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/firebase/auth-session';
import { getUserBoardForYear } from '@/lib/firebase/data';

export async function GET(request: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const year = Number(searchParams.get('year'));
  if (!year) {
    return NextResponse.json({ error: 'year required' }, { status: 400 });
  }

  const board = await getUserBoardForYear(session.uid, year);
  return NextResponse.json({ boardId: board?.id ?? null });
}
