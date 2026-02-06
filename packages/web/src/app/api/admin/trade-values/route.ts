import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-session';
import { isAdmin } from '@/lib/admin';
import { adminDb } from '@/lib/firebase-admin';
import { resetAllCaches } from '@/lib/cache';

export async function GET() {
  const session = await getSessionUser();
  if (!session)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdmin(session.uid))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const doc = await adminDb.collection('config').doc('tradeValues').get();
  return NextResponse.json(doc.data() ?? { values: [], round1Premium: 45 });
}

export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdmin(session.uid))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();
  await adminDb.collection('config').doc('tradeValues').set(body);
  resetAllCaches();

  return NextResponse.json({ ok: true });
}
