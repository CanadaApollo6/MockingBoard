import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSessionUser } from '@/lib/firebase/auth-session';
import { isAdmin } from '@/lib/firebase/admin';
import { getCachedSeasonConfig } from '@/lib/cache';
import { adminDb } from '@/lib/firebase/firebase-admin';
import { SettingsEditor } from './settings-editor';
import type { Announcement } from '@/lib/cache';

export default async function AdminSettingsPage() {
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

  const [config, announcementDoc, draftNamesDoc] = await Promise.all([
    getCachedSeasonConfig(),
    adminDb.collection('config').doc('announcement').get(),
    adminDb.collection('config').doc('draftNames').get(),
  ]);

  const announcement: Announcement = announcementDoc.exists
    ? (announcementDoc.data() as Announcement)
    : { text: '', active: false, variant: 'info' };

  const draftNames = draftNamesDoc.exists
    ? (draftNamesDoc.data() as { adjectives: string[]; nouns: string[] })
    : { adjectives: [], nouns: [] };

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <Link
        href="/admin"
        className="mb-4 inline-block text-sm text-muted-foreground hover:text-foreground"
      >
        &larr; Admin Dashboard
      </Link>
      <h1 className="mb-6 font-[family-name:var(--font-display)] text-2xl font-bold uppercase tracking-tight">
        Settings
      </h1>
      <SettingsEditor
        initialDraftYear={config.draftYear}
        initialStatsYear={config.statsYear}
        initialAnnouncement={announcement}
        initialDraftNames={draftNames}
      />
    </main>
  );
}
