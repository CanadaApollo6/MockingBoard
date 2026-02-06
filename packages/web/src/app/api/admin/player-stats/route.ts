import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-session';
import { isAdmin } from '@/lib/admin';
import { getCachedSeasonStats, getCachedSeasonConfig } from '@/lib/cache';

export async function GET(request: Request) {
  const session = await getSessionUser();
  if (!session)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdmin(session.uid))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const gsisId = searchParams.get('gsisId');

  if (!gsisId)
    return NextResponse.json({ error: 'gsisId required' }, { status: 400 });

  const { statsYear } = await getCachedSeasonConfig();
  const seasonStats = await getCachedSeasonStats(statsYear);
  const stats = seasonStats.find(
    (s: Record<string, unknown>) => s.player_id === gsisId,
  );

  return NextResponse.json({ stats: stats ?? null });
}
