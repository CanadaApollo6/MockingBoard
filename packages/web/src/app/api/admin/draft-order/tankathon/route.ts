import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getSessionUser } from '@/lib/firebase/auth-session';
import { isAdmin } from '@/lib/firebase/admin';
import { adminDb } from '@/lib/firebase/firebase-admin';
import { resetDraftOrderCache } from '@/lib/cache';
import { parseTankathonDraftOrder } from '@/lib/data-import/tankathon-parser';
import type { DraftSlot } from '@mockingboard/shared';

const TANKATHON_URL = 'https://www.tankathon.com/nfl/full_draft';

async function fetchTankathonHtml(): Promise<string> {
  const res = await fetch(TANKATHON_URL, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml',
    },
  });
  if (!res.ok) throw new Error(`Tankathon returned ${res.status}`);
  return res.text();
}

interface PreviewBody {
  action: 'preview';
  year: number;
}

interface CommitBody {
  action: 'commit';
  year: number;
  slots: DraftSlot[];
}

export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdmin(session.uid)))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body: PreviewBody | CommitBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 },
    );
  }

  const { action, year } = body;
  if (!action || !year) {
    return NextResponse.json(
      { error: 'Missing required fields: action, year' },
      { status: 400 },
    );
  }

  if (action === 'preview') {
    try {
      const html = await fetchTankathonHtml();
      const slots = parseTankathonDraftOrder(html);

      if (slots.length < 200) {
        return NextResponse.json(
          {
            error:
              'Parsed fewer than 200 picks — Tankathon may have changed structure or blocked the request.',
          },
          { status: 422 },
        );
      }

      return NextResponse.json({ slots });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to fetch Tankathon data';
      return NextResponse.json({ error: message }, { status: 502 });
    }
  }

  if (action === 'commit') {
    const { slots } = body as CommitBody;
    if (!Array.isArray(slots) || slots.length === 0) {
      return NextResponse.json(
        { error: 'Missing slots to commit' },
        { status: 400 },
      );
    }

    await adminDb.collection('draftOrders').doc(`${year}`).set({ slots });

    resetDraftOrderCache();
    revalidatePath('/draft-order');

    return NextResponse.json({ ok: true, count: slots.length });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
