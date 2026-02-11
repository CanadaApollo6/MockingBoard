import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getSessionUser } from '@/lib/auth-session';
import { isAdmin } from '@/lib/admin';
import { adminDb } from '@/lib/firebase-admin';
import {
  teams,
  coachingStaffs,
  type TeamAbbreviation,
} from '@mockingboard/shared';
import { TeamEditor } from './team-editor';

const teamMap = new Map(teams.map((t) => [t.id, t]));

export default async function AdminTeamEditorPage({
  params,
}: {
  params: Promise<{ abbreviation: string }>;
}) {
  const session = await getSessionUser();
  if (!session) redirect('/login');
  if (!(await isAdmin(session.uid))) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="mt-2 text-muted-foreground">
          You do not have permission to access this page.
        </p>
      </main>
    );
  }

  const { abbreviation } = await params;
  const abbr = abbreviation.toUpperCase() as TeamAbbreviation;
  const team = teamMap.get(abbr);
  if (!team) notFound();

  // Fetch current data directly from Firestore (bypass cache for admin editing)
  const doc = await adminDb.collection('teams').doc(abbr).get();
  const data = doc.data() ?? {};

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <Link
        href="/admin/teams"
        className="mb-4 inline-block text-sm text-muted-foreground hover:text-foreground"
      >
        &larr; All Teams
      </Link>
      <TeamEditor
        abbreviation={abbr}
        teamName={team.name}
        currentCity={data.city ?? team.city}
        currentKeyPlayers={data.keyPlayers ?? []}
        currentCoachingStaff={data.coachingStaff ?? coachingStaffs[abbr] ?? []}
        currentFrontOffice={data.frontOffice ?? []}
        currentNeeds={data.needs ?? team.needs}
        currentFuturePicks={data.futurePicks ?? []}
        currentSeasonOverview={data.seasonOverview ?? { accolades: [] }}
      />
    </main>
  );
}
