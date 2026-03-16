import type { Metadata } from 'next';
import { getCachedRookieSlots } from '@/lib/cache/rookie-slots';
import { getCachedSeasonConfig } from '@/lib/cache';
import { SalaryCapExplainer } from '@/components/learn/salary-cap-explainer';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'NFL Salary Cap Explained',
  description:
    'Learn how the NFL salary cap works with interactive calculators. Understand proration, dead money, restructures, rookie contracts, franchise tags, and more.',
};

export default async function SalaryCapGuidePage() {
  const [rookieSlots, { draftYear }] = await Promise.all([
    getCachedRookieSlots(),
    getCachedSeasonConfig(),
  ]);

  return (
    <main className="mx-auto max-w-screen-xl px-4 py-8">
      <div className="mb-8">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold uppercase tracking-tight sm:text-4xl">
          Salary Cap Explained
        </h1>
        <p className="mt-2 text-muted-foreground">
          An interactive guide to understanding the NFL salary cap
        </p>
      </div>
      <SalaryCapExplainer
        slots={rookieSlots?.slots ?? []}
        draftYear={draftYear}
      />
    </main>
  );
}
