import type { Metadata } from 'next';
import { NflDraftExplainer } from '@/components/learn/nfl-draft-explainer';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'NFL Draft Explained — Rules, Trades, Comp Picks & More',
  description:
    'Everything you need to know about the NFL Draft: how the order works, trading picks, compensatory selections, UDFAs, rookie contracts, and the Combine.',
};

export default function NflDraftGuidePage() {
  return (
    <main className="mx-auto max-w-screen-xl px-4 py-8">
      <div className="mb-8">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold uppercase tracking-tight sm:text-4xl">
          NFL Draft Explained
        </h1>
        <p className="mt-2 text-muted-foreground">
          How the draft works, from pick order to comp picks to undrafted free
          agents.
        </p>
      </div>
      <NflDraftExplainer />
    </main>
  );
}
