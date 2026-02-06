import type { Metadata } from 'next';
import { getCachedDraftOrderSlots, getCachedSeasonConfig } from '@/lib/cache';
import { DraftOrderBoard } from './draft-order-board';

export const revalidate = 3600; // 1-hour ISR

export const metadata: Metadata = {
  title: '2026 NFL Draft Order',
  description:
    '2026 NFL Draft order with pick trade values, surplus value analysis, trade ownership, and team needs.',
};

export default async function DraftOrderPage() {
  const { draftYear } = await getCachedSeasonConfig();
  const slots = await getCachedDraftOrderSlots(draftYear);

  return (
    <main className="mx-auto max-w-screen-xl px-4 py-8">
      <div className="mb-8">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold uppercase tracking-tight sm:text-4xl">
          2026 Draft Order
        </h1>
        <p className="mt-2 text-muted-foreground">
          Pick-by-pick draft order with trade values and team needs.
        </p>
      </div>
      <DraftOrderBoard slots={slots} />
    </main>
  );
}
