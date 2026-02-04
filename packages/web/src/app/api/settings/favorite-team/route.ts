import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { getSessionUser } from '@/lib/auth-session';

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

  let body: { team: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 },
    );
  }

  const { team } = body;

  if (team !== null && !VALID_TEAMS.has(team)) {
    return NextResponse.json({ error: 'Invalid team' }, { status: 400 });
  }

  try {
    const update: Record<string, unknown> = { updatedAt: new Date() };

    if (team === null) {
      const { FieldValue } = await import('firebase-admin/firestore');
      update.favoriteTeam = FieldValue.delete();
    } else {
      update.favoriteTeam = team;
    }

    await adminDb.collection('users').doc(session.uid).update(update);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Failed to save favorite team:', err);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}
