import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getSessionUser } from '@/lib/auth-session';
import { isAdmin } from '@/lib/admin';
import { adminDb } from '@/lib/firebase-admin';

export interface FeaturedConfig {
  prospectOfTheDay?: { playerId: string; overrideUntil: number };
  draftOfTheWeek?: { draftId: string; overrideUntil: number };
}

export async function GET() {
  const session = await getSessionUser();
  if (!session)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdmin(session.uid)))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const doc = await adminDb.collection('config').doc('featured').get();
  const data = (doc.data() as FeaturedConfig) ?? {};

  return NextResponse.json({
    prospectOfTheDay: data.prospectOfTheDay ?? null,
    draftOfTheWeek: data.draftOfTheWeek ?? null,
  });
}

export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdmin(session.uid)))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = (await request.json()) as FeaturedConfig;
  await adminDb.collection('config').doc('featured').set(body, { merge: true });
  revalidatePath('/');

  return NextResponse.json({ ok: true });
}
