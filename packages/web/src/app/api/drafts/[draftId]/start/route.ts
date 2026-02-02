import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-session';
import { startDraft } from '@/lib/lobby-actions';

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
    const result = await startDraft(draftId, session.uid);
    return NextResponse.json(result);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to start draft';
    const status = message.includes('not found')
      ? 404
      : message.includes('Only the creator')
        ? 403
        : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
