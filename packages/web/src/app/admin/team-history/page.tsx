import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSessionUser } from '@/lib/firebase/auth-session';
import { isAdmin } from '@/lib/firebase/admin';
import { teams } from '@mockingboard/shared';
import { getCachedSeasonConfig } from '@/lib/cache';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default async function TeamHistoryPage() {
  const session = await getSessionUser();
  if (!session) redirect('/login');
  if (!(await isAdmin(session.uid))) redirect('/admin');

  const { statsYear } = await getCachedSeasonConfig();
  const sorted = [...teams].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold uppercase tracking-tight">
            Team History
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Year-by-year records, coaching staffs, and key figures
          </p>
        </div>
        <Link
          href="/admin"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Back to Admin
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {sorted.map((team) => (
          <Link
            key={team.id}
            href={`/admin/team-history/${team.id}/${statsYear}`}
          >
            <Card className="transition-colors hover:bg-muted/50">
              <CardHeader className="pb-1">
                <CardTitle className="text-sm font-medium">
                  {team.city} {team.mascot}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-mono text-xs text-muted-foreground">
                  {team.id}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </main>
  );
}
