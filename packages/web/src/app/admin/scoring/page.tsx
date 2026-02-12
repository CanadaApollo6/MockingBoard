import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSessionUser } from '@/lib/firebase/auth-session';
import { isAdmin } from '@/lib/firebase/admin';
import { getCachedSeasonConfig } from '@/lib/cache';
import { ScoringEditor } from './scoring-editor';

export default async function AdminScoringPage() {
  const session = await getSessionUser();
  if (!session) redirect('/login');
  if (!(await isAdmin(session.uid))) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-2xl font-bold">Access Denied</h1>
      </main>
    );
  }

  const { draftYear, statsYear } = await getCachedSeasonConfig();

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <Link
        href="/admin"
        className="mb-4 inline-block text-sm text-muted-foreground hover:text-foreground"
      >
        &larr; Admin Dashboard
      </Link>
      <h1 className="mb-6 font-[family-name:var(--font-display)] text-2xl font-bold uppercase tracking-tight">
        Draft Scoring
      </h1>
      <ScoringEditor currentDraftYear={draftYear} statsYear={statsYear} />
    </main>
  );
}
