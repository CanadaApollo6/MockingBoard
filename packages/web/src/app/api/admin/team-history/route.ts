import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getSessionUser } from '@/lib/auth-session';
import { isAdmin } from '@/lib/admin';
import { adminDb } from '@/lib/firebase-admin';
import type {
  TeamAbbreviation,
  Coach,
  FrontOfficeStaff,
  KeyPlayerOverride,
} from '@mockingboard/shared';
import { teams } from '@mockingboard/shared';

const validTeams = new Set<string>(teams.map((t) => t.id));

export async function GET(request: Request) {
  const session = await getSessionUser();
  if (!session)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdmin(session.uid)))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const team = searchParams.get('team')?.toUpperCase();
  const year = parseInt(searchParams.get('year') ?? '');

  if (!team || !validTeams.has(team))
    return NextResponse.json({ error: 'Invalid team' }, { status: 400 });
  if (!year || year < 2000 || year > 2100)
    return NextResponse.json({ error: 'Invalid year' }, { status: 400 });

  const doc = await adminDb
    .collection('teamSeasons')
    .doc(`${team}_${year}`)
    .get();

  if (!doc.exists) {
    return NextResponse.json({
      team,
      year,
      record: null,
      playoffResult: null,
      coachingStaff: [],
      frontOffice: [],
      keyPlayers: [],
    });
  }

  const data = doc.data()!;
  return NextResponse.json({
    team: data.team ?? team,
    year: data.year ?? year,
    record: data.record ?? null,
    playoffResult: data.playoffResult ?? null,
    coachingStaff: data.coachingStaff ?? [],
    frontOffice: data.frontOffice ?? [],
    keyPlayers: data.keyPlayers ?? [],
  });
}

export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdmin(session.uid)))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();
  const team = (body.team as string)?.toUpperCase();
  const year = body.year as number;

  if (!team || !validTeams.has(team))
    return NextResponse.json({ error: 'Invalid team' }, { status: 400 });
  if (!year || year < 2000 || year > 2100)
    return NextResponse.json({ error: 'Invalid year' }, { status: 400 });

  const update: Record<string, unknown> = {
    team: team as TeamAbbreviation,
    year,
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (body.record !== undefined) update.record = body.record;
  if (body.playoffResult !== undefined)
    update.playoffResult = body.playoffResult;
  if (body.coachingStaff !== undefined)
    update.coachingStaff = body.coachingStaff as Coach[];
  if (body.frontOffice !== undefined)
    update.frontOffice = body.frontOffice as FrontOfficeStaff[];
  if (body.keyPlayers !== undefined) {
    const kp = body.keyPlayers as KeyPlayerOverride[];
    if (kp.length > 4)
      return NextResponse.json({ error: 'Max 4 key players' }, { status: 400 });
    update.keyPlayers = kp;
  }

  await adminDb
    .collection('teamSeasons')
    .doc(`${team}_${year}`)
    .set(update, { merge: true });

  return NextResponse.json({ ok: true });
}
