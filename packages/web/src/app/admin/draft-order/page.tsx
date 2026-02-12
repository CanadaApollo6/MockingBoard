import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSessionUser } from '@/lib/firebase/auth-session';
import { isAdmin } from '@/lib/firebase/admin';
import { getCachedSeasonConfig } from '@/lib/cache';
import { adminDb } from '@/lib/firebase/firebase-admin';
import type { DraftSlot } from '@mockingboard/shared';
import { DraftOrderEditor } from './draft-order-editor';

export default async function AdminDraftOrderPage() {
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
  const doc = await adminDb.collection('draftOrders').doc(`${draftYear}`).get();
  const data = doc.data();
  const slots = (data?.slots as DraftSlot[]) ?? [];

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <Link
        href="/admin"
        className="mb-4 inline-block text-sm text-muted-foreground hover:text-foreground"
      >
        &larr; Admin Dashboard
      </Link>
      <h1 className="mb-6 font-[family-name:var(--font-display)] text-2xl font-bold uppercase tracking-tight">
        Draft Order
      </h1>
      <DraftOrderEditor initialYear={draftYear} initialSlots={slots} />
    </main>
  );
}
