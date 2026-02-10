import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { getSessionUser } from '@/lib/auth-session';
import { SCHOOL_COLORS } from '@/lib/school-colors';

const VALID_TEAMS = new Set([
  'ARI',
  'ATL',
  'BAL',
  'BUF',
  'CAR',
  'CHI',
  'CIN',
  'CLE',
  'DAL',
  'DEN',
  'DET',
  'GB',
  'HOU',
  'IND',
  'JAX',
  'KC',
  'LAC',
  'LAR',
  'LV',
  'MIA',
  'MIN',
  'NE',
  'NO',
  'NYG',
  'NYJ',
  'PHI',
  'PIT',
  'SEA',
  'SF',
  'TB',
  'TEN',
  'WAS',
]);

export async function PUT(request: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { team?: string | null; school?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 },
    );
  }

  const { team, school } = body;

  // Validate: at most one of team/school should be set
  if (team && school) {
    return NextResponse.json(
      { error: 'Cannot set both team and school' },
      { status: 400 },
    );
  }

  if (team !== undefined && team !== null && !VALID_TEAMS.has(team)) {
    return NextResponse.json({ error: 'Invalid team' }, { status: 400 });
  }

  if (
    school !== undefined &&
    school !== null &&
    !SCHOOL_COLORS[school.toLowerCase()]
  ) {
    return NextResponse.json({ error: 'Invalid school' }, { status: 400 });
  }

  try {
    const { FieldValue } = await import('firebase-admin/firestore');
    const update: Record<string, unknown> = { updatedAt: new Date() };

    if (team) {
      // Setting a team clears school
      update.favoriteTeam = team;
      update.favoriteSchool = FieldValue.delete();
    } else if (school) {
      // Setting a school clears team
      update.favoriteSchool = school.toLowerCase();
      update.favoriteTeam = FieldValue.delete();
    } else {
      // Clearing both
      update.favoriteTeam = FieldValue.delete();
      update.favoriteSchool = FieldValue.delete();
    }

    await adminDb.collection('users').doc(session.uid).update(update);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Failed to save theme preference:', err);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}
