import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-session';
import { isAdmin } from '@/lib/admin';
import { getCachedNflRoster, getCachedSeasonConfig } from '@/lib/cache';

export async function GET(request: Request) {
  const session = await getSessionUser();
  if (!session)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdmin(session.uid)))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const query = (searchParams.get('q') ?? '').toLowerCase().trim();
  const team = searchParams.get('team')?.toUpperCase();

  if (query.length < 2) return NextResponse.json({ results: [] });

  const { statsYear } = await getCachedSeasonConfig();
  const roster = await getCachedNflRoster(statsYear);

  const results = roster
    .filter((r) => {
      if (team && r.team !== team) return false;
      return (r.full_name ?? '').toLowerCase().includes(query);
    })
    .slice(0, 15)
    .map((r) => ({
      gsisId: r.gsis_id ?? '',
      name: r.full_name ?? '',
      position: r.position ?? '',
      jersey: String(r.jersey_number ?? ''),
      college: r.college ?? '',
      team: r.team ?? '',
      yearsExp: r.years_exp ?? 0,
    }));

  return NextResponse.json({ results });
}
