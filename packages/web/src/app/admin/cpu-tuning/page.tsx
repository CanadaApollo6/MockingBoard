import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSessionUser } from '@/lib/auth-session';
import { isAdmin } from '@/lib/admin';
import { adminDb } from '@/lib/firebase-admin';
import { NEED_MULTIPLIERS, CPU_PICK_WEIGHTS } from '@mockingboard/shared';
import { CpuTuningEditor } from './cpu-tuning-editor';

export default async function AdminCpuTuningPage() {
  const session = await getSessionUser();
  if (!session) redirect('/login');
  if (!(await isAdmin(session.uid))) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-2xl font-bold">Access Denied</h1>
      </main>
    );
  }

  const doc = await adminDb.collection('config').doc('cpu').get();
  const data = doc.data() ?? {};

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <Link
        href="/admin"
        className="mb-4 inline-block text-sm text-muted-foreground hover:text-foreground"
      >
        &larr; Admin Dashboard
      </Link>
      <h1 className="mb-6 font-[family-name:var(--font-display)] text-2xl font-bold uppercase tracking-tight">
        CPU Tuning
      </h1>
      <CpuTuningEditor
        initialNeedMultipliers={
          (data.needMultipliers as number[]) ?? [...NEED_MULTIPLIERS]
        }
        initialWildThresholds={(data.wildThresholds as number[]) ?? []}
        initialMaxNeedMults={(data.maxNeedMults as number[]) ?? []}
        initialCpuPickWeights={
          (data.cpuPickWeights as { top: number; mid: number }) ?? {
            top: CPU_PICK_WEIGHTS.TOP,
            mid: CPU_PICK_WEIGHTS.MID,
          }
        }
      />
    </main>
  );
}
