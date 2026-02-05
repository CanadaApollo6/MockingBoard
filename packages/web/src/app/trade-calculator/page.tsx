import type { Metadata } from 'next';
import { getCachedDraftOrderSlots } from '@/lib/cache';
import { TradeCalculator } from '@/components/trade-calculator';

const CURRENT_YEAR = 2026;

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'NFL Draft Trade Value Calculator',
  description:
    'Compare NFL draft pick trade values using the Rich Hill trade value chart and Baldwin surplus value model.',
};

export default async function TradeCalculatorPage() {
  const slots = await getCachedDraftOrderSlots(CURRENT_YEAR);

  // Serialize slots to minimal shape for client
  const picks = slots.map((s) => ({
    overall: s.overall,
    round: s.round,
    pick: s.pick,
    team: s.teamOverride ?? s.team,
  }));

  return (
    <main className="mx-auto max-w-screen-xl px-4 py-8">
      <div className="mb-8">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold uppercase tracking-tight sm:text-4xl">
          Trade Calculator
        </h1>
        <p className="mt-2 text-muted-foreground">
          Compare draft pick trade values using the Rich Hill chart or Baldwin
          surplus model.
        </p>
      </div>
      <TradeCalculator picks={picks} year={CURRENT_YEAR} />
    </main>
  );
}
