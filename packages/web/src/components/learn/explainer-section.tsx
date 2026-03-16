'use client';

import type { ReactNode } from 'react';
import { Separator } from '@/components/ui/separator';

interface ExplainerSectionProps {
  id: string;
  title: string;
  children: ReactNode;
}

export function ExplainerSection({
  id,
  title,
  children,
}: ExplainerSectionProps) {
  return (
    <section id={id} className="scroll-mt-20 space-y-4">
      <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold uppercase tracking-tight">
        {title}
      </h2>
      <Separator />
      <div className="space-y-4">{children}</div>
    </section>
  );
}
