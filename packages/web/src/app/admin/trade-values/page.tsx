import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSessionUser } from '@/lib/firebase/auth-session';
import { isAdmin } from '@/lib/firebase/admin';
import { adminDb } from '@/lib/firebase/firebase-admin';
import { TradeValuesEditor } from './trade-values-editor';

export default async function AdminTradeValuesPage() {
  const session = await getSessionUser();
  if (!session) redirect('/login');
  if (!(await isAdmin(session.uid))) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-2xl font-bold">Access Denied</h1>
      </main>
    );
  }

  const doc = await adminDb.collection('config').doc('tradeValues').get();
  const data = doc.data() ?? {};

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <Link
        href="/admin"
        className="mb-4 inline-block text-sm text-muted-foreground hover:text-foreground"
      >
        &larr; Admin Dashboard
      </Link>
      <h1 className="mb-6 font-[family-name:var(--font-display)] text-2xl font-bold uppercase tracking-tight">
        Trade Value Chart
      </h1>
      <TradeValuesEditor
        initialValues={(data.values as number[]) ?? []}
        initialPremium={(data.round1Premium as number) ?? 45}
      />
    </main>
  );
}
