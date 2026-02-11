import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getSessionUser } from '@/lib/auth-session';
import { isAdmin } from '@/lib/admin';
import { adminDb } from '@/lib/firebase-admin';
import { resetDraftOrderCache } from '@/lib/cache';
import type { DraftSlot } from '@mockingboard/shared';

export async function GET(request: Request) {
  const session = await getSessionUser();
  if (!session)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdmin(session.uid)))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const year = parseInt(searchParams.get('year') ?? '');
  if (!year)
    return NextResponse.json({ error: 'Year is required' }, { status: 400 });

  const doc = await adminDb.collection('draftOrders').doc(`${year}`).get();
  const data = doc.data();

  return NextResponse.json({
    year,
    slots: (data?.slots as DraftSlot[]) ?? [],
  });
}

export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdmin(session.uid)))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();
  const { year, slots } = body as { year: number; slots: DraftSlot[] };

  if (!year || !Array.isArray(slots))
    return NextResponse.json(
      { error: 'Year and slots are required' },
      { status: 400 },
    );

  await adminDb.collection('draftOrders').doc(`${year}`).set({ slots });

  resetDraftOrderCache();
  revalidatePath('/draft-order');

  return NextResponse.json({ ok: true });
}
