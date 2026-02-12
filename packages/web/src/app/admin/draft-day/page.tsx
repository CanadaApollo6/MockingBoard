import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSessionUser } from '@/lib/firebase/auth-session';
import { isAdmin } from '@/lib/firebase/admin';
import { adminDb } from '@/lib/firebase/firebase-admin';
import { DraftDayAdmin } from './draft-day-admin';

export default async function AdminDraftDayPage() {
  const session = await getSessionUser();
  if (!session) redirect('/login');
  if (!(await isAdmin(session.uid))) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-2xl font-bold">Access Denied</h1>
      </main>
    );
  }

  const doc = await adminDb.doc('config/draftDay').get();
  const data = doc.data() ?? {};
  const initialConfig = {
    mode: (data.mode as string) ?? 'countdown',
    currentPick: (data.currentPick as number) ?? 0,
    clockExpiresAt: data.clockExpiresAt?.toDate?.()?.toISOString() ?? null,
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <Link
        href="/admin"
        className="mb-4 inline-block text-sm text-muted-foreground hover:text-foreground"
      >
        &larr; Admin Dashboard
      </Link>
      <h1 className="mb-6 font-[family-name:var(--font-display)] text-2xl font-bold uppercase tracking-tight">
        Draft Day Controls
      </h1>
      <DraftDayAdmin initial={initialConfig} />
    </main>
  );
}
