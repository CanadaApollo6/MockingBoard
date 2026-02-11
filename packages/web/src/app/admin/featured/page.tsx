import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSessionUser } from '@/lib/auth-session';
import { isAdmin } from '@/lib/admin';
import { adminDb } from '@/lib/firebase-admin';
import { getCachedSeasonConfig, getCachedPlayers } from '@/lib/cache';
import { FeaturedEditor } from './featured-editor';
import type { FeaturedConfig } from '@/app/api/admin/featured/route';

export default async function AdminFeaturedPage() {
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

  const { draftYear } = await getCachedSeasonConfig();
  const [featuredDoc, players] = await Promise.all([
    adminDb.collection('config').doc('featured').get(),
    getCachedPlayers(draftYear),
  ]);

  const featured = (featuredDoc.data() as FeaturedConfig) ?? {};

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <Link
        href="/admin"
        className="mb-4 inline-block text-sm text-muted-foreground hover:text-foreground"
      >
        &larr; Admin Dashboard
      </Link>
      <h1 className="mb-6 font-[family-name:var(--font-display)] text-2xl font-bold uppercase tracking-tight">
        Featured Content
      </h1>
      <FeaturedEditor
        initialProspect={featured.prospectOfTheDay ?? null}
        initialDraft={featured.draftOfTheWeek ?? null}
        players={players.slice(0, 100).map((p) => ({
          id: p.id,
          name: p.name,
          position: p.position,
          school: p.school,
        }))}
      />
    </main>
  );
}
