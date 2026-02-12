import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getSessionUser } from '@/lib/firebase/auth-session';
import { isAdmin } from '@/lib/firebase/admin';
import { adminDb } from '@/lib/firebase/firebase-admin';
import { resetPlayerCache } from '@/lib/cache';
import { hydrateDocs } from '@/lib/firebase/sanitize';
import type { Player, Position } from '@mockingboard/shared';

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

  const search = searchParams.get('search')?.toLowerCase() ?? '';
  const position = searchParams.get('position') ?? '';
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 200);
  const offset = parseInt(searchParams.get('offset') ?? '0');

  let query = adminDb
    .collection('players')
    .where('year', '==', year)
    .orderBy('consensusRank');

  if (position) {
    query = adminDb
      .collection('players')
      .where('year', '==', year)
      .where('position', '==', position as Position)
      .orderBy('consensusRank');
  }

  const snapshot = await query.get();
  let players = hydrateDocs<Player>(snapshot);

  if (search) {
    players = players.filter(
      (p) =>
        p.name.toLowerCase().includes(search) ||
        p.school.toLowerCase().includes(search),
    );
  }

  const total = players.length;
  const page = players.slice(offset, offset + limit);

  return NextResponse.json({ players: page, total });
}

export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdmin(session.uid)))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();
  const { id, ...data } = body as Player;

  if (!id)
    return NextResponse.json({ error: 'Player ID required' }, { status: 400 });

  await adminDb.collection('players').doc(id).set(data, { merge: true });
  resetPlayerCache();
  revalidatePath('/players');

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const session = await getSessionUser();
  if (!session)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdmin(session.uid)))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id)
    return NextResponse.json({ error: 'Player ID required' }, { status: 400 });

  await adminDb.collection('players').doc(id).delete();
  resetPlayerCache();
  revalidatePath('/players');

  return NextResponse.json({ ok: true });
}
