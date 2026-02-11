'use client';

import { getGradeDisplay, type GradeSystem } from '@mockingboard/shared';
import { cn } from '@/lib/utils';

interface GradeBadgeProps {
  grade: number;
  system: GradeSystem;
  className?: string;
}

export function GradeBadge({ grade, system, className }: GradeBadgeProps) {
  const { shortLabel, color, bg } = getGradeDisplay(grade, system);

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
        bg,
        color,
        className,
      )}
    >
      {shortLabel}
    </span>
  );
}
