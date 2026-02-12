import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/firebase/auth-session';
import { runCpuCascade, advanceSingleCpuPick } from '@/lib/draft-actions';
import { getDraftOrFail } from '@/lib/firebase/data';
import { AppError } from '@/lib/validate';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ draftId: string }> },
) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { draftId } = await params;

  try {
    const draft = await getDraftOrFail(draftId);

    if (!draft.participants[session.uid]) {
      return NextResponse.json({ error: 'Not a participant' }, { status: 403 });
    }

    const url = new URL(request.url);
    const mode = url.searchParams.get('mode');

    if (mode === 'single') {
      const { pick, isComplete } = await advanceSingleCpuPick(draftId);
      return NextResponse.json({ pick, isComplete });
    }

    const { picks, isComplete } = await runCpuCascade(draftId);
    return NextResponse.json({ picks, isComplete });
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('Failed to advance CPU pick:', err);
    return NextResponse.json(
      { error: 'Failed to advance pick' },
      { status: 500 },
    );
  }
}
