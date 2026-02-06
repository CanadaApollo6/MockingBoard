import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSessionUser } from '@/lib/auth-session';
import { isAdmin } from '@/lib/admin';
import { adminDb } from '@/lib/firebase-admin';
import { getCachedSeasonConfig } from '@/lib/cache';
import { DraftResultsEditor } from './draft-results-editor';

export default async function AdminDraftResultsPage() {
  const session = await getSessionUser();
  if (!session) redirect('/login');
  if (!isAdmin(session.uid)) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="mt-2 text-muted-foreground">
          You do not have permission to access this page.
        </p>
      </main>
    );
  }

  const { draftYear } = await getCachedSeasonConfig();
  const doc = await adminDb
    .collection('draftResults')
    .doc(`${draftYear}`)
    .get();
  const initialPicks = doc.data()?.picks ?? [];

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <Link
        href="/admin"
        className="mb-4 inline-block text-sm text-muted-foreground hover:text-foreground"
      >
        &larr; Admin Dashboard
      </Link>
      <h1 className="mb-6 font-[family-name:var(--font-display)] text-2xl font-bold uppercase tracking-tight">
        Draft Results
      </h1>
      <DraftResultsEditor initialYear={draftYear} initialPicks={initialPicks} />
    </main>
  );
}
