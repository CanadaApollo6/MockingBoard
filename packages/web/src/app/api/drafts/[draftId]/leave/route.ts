import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-session';
import { leaveLobby } from '@/lib/lobby-actions';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ draftId: string }> },
) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { draftId } = await params;

  try {
    await leaveLobby(draftId, session.uid);
    return NextResponse.json({ status: 'ok' });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to leave draft';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
