import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSessionUser } from '@/lib/firebase/auth-session';
import { isAdmin } from '@/lib/firebase/admin';
import { getCachedTeamDocs } from '@/lib/cache';
import { teams } from '@mockingboard/shared';
import { Badge } from '@/components/ui/badge';

const divisions = [
  { conference: 'AFC', division: 'East' },
  { conference: 'AFC', division: 'North' },
  { conference: 'AFC', division: 'South' },
  { conference: 'AFC', division: 'West' },
  { conference: 'NFC', division: 'East' },
  { conference: 'NFC', division: 'North' },
  { conference: 'NFC', division: 'South' },
  { conference: 'NFC', division: 'West' },
] as const;

export default async function AdminTeamsPage() {
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

  const teamDocs = await getCachedTeamDocs();
  const docMap = new Map(teamDocs.map((d) => [d.id, d]));

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <Link
        href="/admin"
        className="mb-4 inline-block text-sm text-muted-foreground hover:text-foreground"
      >
        &larr; Admin Dashboard
      </Link>
      <h1 className="mb-6 font-[family-name:var(--font-display)] text-2xl font-bold uppercase tracking-tight">
        Team Management
      </h1>

      <div className="space-y-6">
        {divisions.map(({ conference, division }) => {
          const divTeams = teams.filter(
            (t) => t.conference === conference && t.division === division,
          );
          return (
            <div key={`${conference}-${division}`}>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {conference} {division}
              </h2>
              <div className="space-y-1">
                {divTeams.map((team) => {
                  const doc = docMap.get(team.id);
                  const needsCount = doc?.needs?.length ?? 0;
                  const kpCount = doc?.keyPlayers?.length ?? 0;
                  const csCount = doc?.coachingStaff?.length ?? 0;
                  const foCount = doc?.frontOffice?.length ?? 0;

                  return (
                    <Link
                      key={team.id}
                      href={`/admin/teams/${team.id}`}
                      className="flex items-center justify-between rounded-md border px-3 py-2.5 transition-colors hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-8 font-mono text-xs text-muted-foreground">
                          {team.id}
                        </span>
                        <span className="text-sm font-medium">{team.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={needsCount > 0 ? 'default' : 'outline'}
                          className="text-xs"
                        >
                          {needsCount} Needs
                        </Badge>
                        <Badge
                          variant={kpCount > 0 ? 'default' : 'outline'}
                          className="text-xs"
                        >
                          {kpCount}/4 Players
                        </Badge>
                        <Badge
                          variant={csCount > 0 ? 'default' : 'outline'}
                          className="text-xs"
                        >
                          {csCount} Coaches
                        </Badge>
                        <Badge
                          variant={foCount > 0 ? 'default' : 'outline'}
                          className="text-xs"
                        >
                          {foCount} FO
                        </Badge>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
