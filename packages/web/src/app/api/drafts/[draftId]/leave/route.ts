import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-session';
import { leaveLobby } from '@/lib/lobby-actions';
import { safeError } from '@/lib/validate';

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
    return NextResponse.json(
      { error: safeError(err, 'Failed to leave draft') },
      { status: 400 },
    );
  }
}
