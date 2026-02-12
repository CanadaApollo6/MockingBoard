import { NextResponse } from 'next/server';
import { getPublicBoards } from '@/lib/firebase/data';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get('cursor');

  const { boards, hasMore } = await getPublicBoards({
    afterSeconds: cursor ? Number(cursor) : undefined,
  });

  return NextResponse.json({ boards, hasMore });
}
