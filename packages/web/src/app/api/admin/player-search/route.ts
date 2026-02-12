import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/firebase/auth-session';
import { isAdmin } from '@/lib/firebase/admin';
import { getCachedRoster } from '@/lib/cache';

export async function GET(request: Request) {
  const session = await getSessionUser();
  if (!session)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdmin(session.uid)))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const query = (searchParams.get('q') ?? '').toLowerCase().trim();
  const team = searchParams.get('team')?.toUpperCase();

  if (query.length < 2 || !team) return NextResponse.json({ results: [] });

  const roster = await getCachedRoster(team);
  if (!roster) return NextResponse.json({ results: [] });

  const all = [...roster.offense, ...roster.defense, ...roster.specialTeams];
  const results = all
    .filter((p) => p.name.toLowerCase().includes(query))
    .slice(0, 15)
    .map((p) => ({
      gsisId: p.id,
      name: p.name,
      position: p.position,
      jersey: p.jersey,
      college: p.college,
      team,
      yearsExp: p.experience,
    }));

  return NextResponse.json({ results });
}
