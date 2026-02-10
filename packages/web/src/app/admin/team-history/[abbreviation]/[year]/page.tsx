import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getSessionUser } from '@/lib/auth-session';
import { isAdmin } from '@/lib/admin';
import { adminDb } from '@/lib/firebase-admin';
import { getCachedSeasonConfig } from '@/lib/cache';
import { teams } from '@mockingboard/shared';
import type {
  Coach,
  FrontOfficeStaff,
  KeyPlayerOverride,
} from '@mockingboard/shared';
import { SeasonEditor } from './season-editor';

const validTeams = new Set<string>(teams.map((t) => t.id));

export default async function TeamSeasonPage({
  params,
}: {
  params: Promise<{ abbreviation: string; year: string }>;
}) {
  const session = await getSessionUser();
  if (!session) redirect('/login');
  if (!(await isAdmin(session.uid))) redirect('/admin');

  const { abbreviation, year: yearStr } = await params;
  const abbr = abbreviation.toUpperCase();
  const year = parseInt(yearStr);

  if (!validTeams.has(abbr) || !year || year < 2000 || year > 2100) notFound();

  const team = teams.find((t) => t.id === abbr)!;
  const { statsYear } = await getCachedSeasonConfig();

  const doc = await adminDb
    .collection('teamSeasons')
    .doc(`${abbr}_${year}`)
    .get();
  const data = doc.data() ?? {};

  // Build year navigation range
  const startYear = 2020;
  const endYear = statsYear;
  const years = Array.from(
    { length: endYear - startYear + 1 },
    (_, i) => endYear - i,
  );

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/admin/team-history"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          &larr; All Teams
        </Link>
        <div className="flex items-center gap-2">
          {years.map((y) => (
            <Link
              key={y}
              href={`/admin/team-history/${abbr}/${y}`}
              className={`rounded-md px-2 py-1 text-xs ${
                y === year
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              {y}
            </Link>
          ))}
        </div>
      </div>

      <SeasonEditor
        abbreviation={abbr}
        teamName={`${team.city} ${team.mascot}`}
        year={year}
        initialRecord={data.record ?? null}
        initialPlayoffResult={data.playoffResult ?? ''}
        initialCoachingStaff={(data.coachingStaff as Coach[]) ?? []}
        initialFrontOffice={(data.frontOffice as FrontOfficeStaff[]) ?? []}
        initialKeyPlayers={(data.keyPlayers as KeyPlayerOverride[]) ?? []}
      />
    </main>
  );
}
