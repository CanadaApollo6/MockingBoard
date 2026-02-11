import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSessionUser } from '@/lib/auth-session';
import { isAdmin } from '@/lib/admin';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

const sections = [
  {
    title: 'Team Management',
    description: 'Key players, coaching staff, front office',
    href: '/admin/teams',
  },
  {
    title: 'Draft Results',
    description: 'Enter actual NFL draft picks',
    href: '/admin/draft-results',
  },
  {
    title: 'Scouting Upload',
    description: 'Upload prospect CSV data',
    href: '/admin/upload',
  },
  {
    title: 'Team History',
    description: 'Year-by-year records and key figures',
    href: '/admin/team-history',
  },
  {
    title: 'Draft Order',
    description: 'Manage pick order and trades',
    href: '/admin/draft-order',
  },
  {
    title: 'Prospects',
    description: 'Browse and edit prospect data',
    href: '/admin/prospects',
  },
  {
    title: 'Featured Content',
    description: 'Curate prospect and draft highlights',
    href: '/admin/featured',
  },
  {
    title: 'Trade Values',
    description: 'Edit the draft pick value chart',
    href: '/admin/trade-values',
  },
  {
    title: 'CPU Tuning',
    description: 'Adjust CPU draft behavior constants',
    href: '/admin/cpu-tuning',
  },
  {
    title: 'Draft Scoring',
    description: 'Score mock drafts against real results',
    href: '/admin/scoring',
  },
  {
    title: 'Moderation',
    description: 'Review user-generated content',
    href: '/admin/moderation',
  },
  {
    title: 'Settings',
    description: 'Season config, announcements, cache',
    href: '/admin/settings',
  },
];

export default async function AdminDashboardPage() {
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
