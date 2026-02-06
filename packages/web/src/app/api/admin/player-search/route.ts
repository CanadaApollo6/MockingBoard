import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-session';
import { isAdmin } from '@/lib/admin';
import { getCachedNflRoster, getCachedSeasonConfig } from '@/lib/cache';

export async function GET(request: Request) {
  const session = await getSessionUser();
  if (!session)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdmin(session.uid))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const query = (searchParams.get('q') ?? '').toLowerCase().trim();
  const team = searchParams.get('team')?.toUpperCase();

  if (query.length < 2) return NextResponse.json({ results: [] });

  const { statsYear } = await getCachedSeasonConfig();
  const roster = await getCachedNflRoster(statsYear);

  const results = roster
    .filter((r: Record<string, unknown>) => {
      if (team && r.team !== team) return false;
      const name = String(r.full_name ?? '').toLowerCase();
      return name.includes(query);
    })
    .slice(0, 15)
    .map((r: Record<string, unknown>) => ({
      gsisId: String(r.gsis_id ?? ''),
      name: String(r.full_name ?? ''),
      position: String(r.position ?? ''),
      jersey: String(r.jersey_number ?? ''),
      college: String(r.college ?? ''),
      team: String(r.team ?? ''),
      yearsExp: typeof r.years_exp === 'number' ? r.years_exp : 0,
    }));

  return NextResponse.json({ results });
}
