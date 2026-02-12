import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSessionUser } from '@/lib/firebase/auth-session';
import { isAdmin } from '@/lib/firebase/admin';
import { getCachedSeasonConfig } from '@/lib/cache';
import { ProspectsEditor } from './prospects-editor';

export default async function AdminProspectsPage() {
  const session = await getSessionUser();
  if (!session) redirect('/login');
  if (!(await isAdmin(session.uid))) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="mt-2 text-muted-foreground">
          You do not have permission to access this page.
        </p>
      </main>
    );
  }

  const { draftYear } = await getCachedSeasonConfig();

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <Link
        href="/admin"
        className="mb-4 inline-block text-sm text-muted-foreground hover:text-foreground"
      >
        &larr; Admin Dashboard
      </Link>
      <h1 className="mb-6 font-[family-name:var(--font-display)] text-2xl font-bold uppercase tracking-tight">
        Prospect Management
      </h1>
      <ProspectsEditor initialYear={draftYear} />
    </main>
  );
}
