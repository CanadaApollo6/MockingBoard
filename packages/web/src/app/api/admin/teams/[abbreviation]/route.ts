import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { FieldValue } from 'firebase-admin/firestore';
import { getSessionUser } from '@/lib/auth-session';
import { isAdmin } from '@/lib/admin';
import { adminDb } from '@/lib/firebase-admin';
import { resetTeamsCache } from '@/lib/cache';
import type {
  KeyPlayerOverride,
  Coach,
  FrontOfficeStaff,
  FuturePickSeed,
  SeasonOverview,
  Position,
  TeamAbbreviation,
} from '@mockingboard/shared';
import { teams } from '@mockingboard/shared';

const validTeams = new Set<string>(teams.map((t) => t.id));

export async function GET(
  request: Request,
  { params }: { params: Promise<{ abbreviation: string }> },
) {
  const session = await getSessionUser();
  if (!session)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdmin(session.uid)))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { abbreviation } = await params;
  const abbr = abbreviation.toUpperCase();
  if (!validTeams.has(abbr))
    return NextResponse.json({ error: 'Invalid team' }, { status: 400 });

  const doc = await adminDb.collection('teams').doc(abbr).get();
  const data = doc.data() ?? {};

  return NextResponse.json({
    keyPlayers: data.keyPlayers ?? [],
    coachingStaff: data.coachingStaff ?? [],
    frontOffice: data.frontOffice ?? [],
    needs: data.needs ?? [],
    futurePicks: data.futurePicks ?? [],
    seasonOverview: data.seasonOverview ?? { accolades: [] },
    city: data.city ?? '',
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ abbreviation: string }> },
) {
  const session = await getSessionUser();
  if (!session)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdmin(session.uid)))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { abbreviation } = await params;
  const abbr = abbreviation.toUpperCase();
  if (!validTeams.has(abbr))
    return NextResponse.json({ error: 'Invalid team' }, { status: 400 });

  const body = await request.json();
  const update: Record<string, unknown> = {};

  if (body.keyPlayers !== undefined) {
    const kp = body.keyPlayers as KeyPlayerOverride[];
    if (kp.length > 4)
      return NextResponse.json({ error: 'Max 4 key players' }, { status: 400 });
    update.keyPlayers = kp;
  }

  if (body.coachingStaff !== undefined) {
    update.coachingStaff = body.coachingStaff as Coach[];
  }

  if (body.frontOffice !== undefined) {
    update.frontOffice = body.frontOffice as FrontOfficeStaff[];
  }

  if (body.needs !== undefined) {
    update.needs = body.needs as Position[];
  }

  if (body.futurePicks !== undefined) {
    update.futurePicks = body.futurePicks as FuturePickSeed[];
  }

  if (body.city !== undefined) {
    update.city = body.city as string;
  }

  if (body.seasonOverview !== undefined) {
    const so = body.seasonOverview as SeasonOverview;
    if (so.accolades && so.accolades.length > 20)
      return NextResponse.json({ error: 'Max 20 accolades' }, { status: 400 });
    update.seasonOverview = so;
  }

  if (Object.keys(update).length === 0)
    return NextResponse.json({ error: 'No data provided' }, { status: 400 });

  update.updatedAt = FieldValue.serverTimestamp();
  await adminDb
    .collection('teams')
    .doc(abbr as TeamAbbreviation)
    .set(update, { merge: true });

  resetTeamsCache();
  revalidatePath(`/teams/${abbr}`);
  revalidatePath(`/teams/${abbr.toLowerCase()}`);
  revalidatePath('/teams');

  return NextResponse.json({ ok: true });
}
