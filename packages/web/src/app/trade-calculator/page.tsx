import type { Metadata } from 'next';
import { getCachedDraftOrderSlots, getCachedSeasonConfig } from '@/lib/cache';
import { TradeCalculator } from '@/components/trade/trade-calculator';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'NFL Draft Trade Value Calculator',
  description:
    'Compare NFL draft pick trade values using the Rich Hill trade value chart and Baldwin surplus value model.',
};

export default async function TradeCalculatorPage() {
  const { draftYear } = await getCachedSeasonConfig();
  const slots = await getCachedDraftOrderSlots(draftYear);

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
      <TradeCalculator picks={picks} year={draftYear} />
    </main>
  );
}
