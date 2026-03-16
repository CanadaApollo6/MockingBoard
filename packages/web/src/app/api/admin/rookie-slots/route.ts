import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';
import { getSessionUser } from '@/lib/firebase/auth-session';
import { adminDb } from '@/lib/firebase/firebase-admin';
import { isAdmin } from '@/lib/firebase/admin';
import { resetRookieSlotsCache } from '@/lib/cache';
import type { RookieSlotData } from '@mockingboard/shared';
import { parseRookieSlotValues } from '@/lib/data-import/otc-rookie-parser';

async function fetchOtcHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml',
    },
  });
  if (!res.ok) throw new Error(`OTC returned ${res.status} for ${url}`);
  return res.text();
}

interface PreviewBody {
  action: 'preview';
  year: number;
}

interface CommitBody {
  action: 'commit';
  data: RookieSlotData;
}

export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!(await isAdmin(session.uid))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: PreviewBody | CommitBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 },
    );
  }

  const { action } = body;
  if (!action) {
    return NextResponse.json(
      { error: 'Missing required field: action' },
      { status: 400 },
    );
  }

  if (action === 'preview') {
    const { year } = body as PreviewBody;
    if (!year) {
      return NextResponse.json(
        { error: 'Missing required field: year' },
        { status: 400 },
      );
    }

    try {
      const html = await fetchOtcHtml('https://overthecap.com/draft');
      const slots = parseRookieSlotValues(html);

      if (slots.length === 0) {
        return NextResponse.json(
          {
            error:
              'No rookie slot data parsed from OTC. The page structure may have changed.',
          },
          { status: 422 },
        );
      }

      const data: RookieSlotData = { year, slots };
      return NextResponse.json({ data });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to fetch OTC data';
      return NextResponse.json({ error: message }, { status: 502 });
    }
  }

  if (action === 'commit') {
    const { data } = body as CommitBody;
    if (!data) {
      return NextResponse.json(
        { error: 'Missing data to commit' },
        { status: 400 },
      );
    }

    await adminDb
      .collection('rookieSlotValues')
      .doc('current')
      .set(
        { ...data, updatedAt: FieldValue.serverTimestamp() },
        { merge: true },
      );

    resetRookieSlotsCache();
    revalidatePath('/', 'layout');

    return NextResponse.json({ slots: data.slots.length });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
