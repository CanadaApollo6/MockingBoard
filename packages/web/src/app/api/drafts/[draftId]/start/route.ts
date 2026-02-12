import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/firebase/auth-session';
import { startDraft } from '@/lib/lobby-actions';
import { safeError, AppError } from '@/lib/validate';

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
    const message = safeError(err, 'Failed to start draft');
    const status = err instanceof AppError ? err.status : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
