import type { Metadata } from 'next';
import { ContractBuilder } from '@/components/contract-builder/contract-builder';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'NFL Contract Builder',
  description:
    'Build and analyze NFL player contracts. Calculate cap hits, dead money, proration, and restructure scenarios with our CBA-compliant contract calculator.',
};

export default function ContractBuilderPage() {
  return (
    <main className="mx-auto max-w-screen-xl px-4 py-8">
      <div className="mb-8">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold uppercase tracking-tight sm:text-4xl">
          Contract Builder
        </h1>
        <p className="mt-2 text-muted-foreground">
          Model NFL contracts and see cap hit, dead money, and restructure
          implications in real time.
        </p>
      </div>
      <ContractBuilder />
    </main>
  );
}
