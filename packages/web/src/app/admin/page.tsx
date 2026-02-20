import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSessionUser } from '@/lib/firebase/auth-session';
import { isAdmin } from '@/lib/firebase/admin';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Routes } from '@/routes';

const sections = [
  {
    title: 'Team Management',
    description: 'Key players, coaching staff, front office',
    href: Routes.ADMIN_TEAMS,
  },
  {
    title: 'Draft Results',
    description: 'Enter actual NFL draft picks',
    href: Routes.ADMIN_DRAFT_RESULTS,
  },
  {
    title: 'Scouting Upload',
    description: 'Upload prospect CSV data',
    href: Routes.ADMIN_UPLOAD,
  },
  {
    title: 'Team History',
    description: 'Year-by-year records and key figures',
    href: Routes.ADMIN_TEAM_HISTORY,
  },
  {
    title: 'Draft Order',
    description: 'Manage pick order and trades',
    href: Routes.ADMIN_DRAFT_ORDER,
  },
  {
    title: 'Prospects',
    description: 'Browse and edit prospect data',
    href: Routes.ADMIN_PROSPECTS,
  },
  {
    title: 'Featured Content',
    description: 'Curate prospect and draft highlights',
    href: Routes.ADMIN_FEATURED,
  },
  {
    title: 'Trade Values',
    description: 'Edit the draft pick value chart',
    href: Routes.ADMIN_TRADE_VALUES,
  },
  {
    title: 'CPU Tuning',
    description: 'Adjust CPU draft behavior constants',
    href: Routes.ADMIN_CPU_TUNING,
  },
  {
    title: 'Draft Scoring',
    description: 'Score mock drafts against real results',
    href: Routes.ADMIN_SCORING,
  },
  {
    title: 'Contracts',
    description: 'Import OTC salary cap data',
    href: Routes.ADMIN_CONTRACTS,
  },
  {
    title: 'Staff Import',
    description: 'Import coaching staff from Wikipedia',
    href: Routes.ADMIN_STAFF,
  },
  {
    title: 'Moderation',
    description: 'Review user-generated content',
    href: Routes.ADMIN_MODERATION,
  },
  {
    title: 'Settings',
    description: 'Season config, announcements, cache',
    href: Routes.ADMIN_SETTINGS,
  },
];

export default async function AdminDashboardPage() {
  const session = await getSessionUser();
  if (!session) redirect(Routes.AUTH);
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

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 font-[family-name:var(--font-display)] text-2xl font-bold uppercase tracking-tight">
        Admin Dashboard
      </h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((s) => (
          <Link key={s.href} href={s.href}>
            <Card className="transition-colors hover:bg-muted/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{s.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{s.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </main>
  );
}
