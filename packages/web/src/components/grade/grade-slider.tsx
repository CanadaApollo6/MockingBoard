'use client';

import { cn } from '@/lib/utils';

interface GradeSliderProps {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
}

const TIERS = [
  {
    label: 'Practice Squad',
    value: 25,
    min: 0,
    max: 39,
    color: 'text-mb-danger',
    bg: 'bg-mb-danger/15 border-mb-danger/30',
  },
  {
    label: 'Roster',
    value: 45,
    min: 40,
    max: 49,
    color: 'text-yellow-500',
    bg: 'bg-yellow-500/15 border-yellow-500/30',
  },
  {
    label: 'Backup',
    value: 55,
    min: 50,
    max: 59,
    color: 'text-yellow-500',
    bg: 'bg-yellow-500/15 border-yellow-500/30',
  },
  {
    label: 'Contributor',
    value: 65,
    min: 60,
    max: 69,
    color: 'text-mb-accent',
    bg: 'bg-mb-accent/15 border-mb-accent/30',
  },
  {
    label: 'Starter',
    value: 75,
    min: 70,
    max: 79,
    color: 'text-mb-accent',
    bg: 'bg-mb-accent/15 border-mb-accent/30',
  },
  {
    label: 'Pro Bowl',
    value: 85,
    min: 80,
    max: 89,
    color: 'text-mb-success',
    bg: 'bg-mb-success/15 border-mb-success/30',
  },
  {
    label: 'Elite',
    value: 95,
    min: 90,
    max: 100,
    color: 'text-mb-success',
    bg: 'bg-mb-success/15 border-mb-success/30',
  },
] as const;

function findTier(grade: number) {
  return TIERS.find((t) => grade >= t.min && grade <= t.max) ?? null;
}

export { gradeColor } from '@/lib/colors/grade-color';

export function GradeSlider({ value, onChange }: GradeSliderProps) {
  const activeTier = value != null ? findTier(value) : null;

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-muted-foreground">
        Grade <span className="font-normal">(optional)</span>
      </label>
      <div className="flex flex-wrap gap-1.5">
        {TIERS.map((tier) => {
          const isActive = activeTier?.value === tier.value;
          return (
            <button
              key={tier.label}
              type="button"
              onClick={() => onChange(isActive ? undefined : tier.value)}
              className={cn(
                'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                isActive
                  ? `${tier.bg} ${tier.color}`
                  : 'border-transparent bg-muted text-muted-foreground hover:text-foreground',
              )}
            >
              {tier.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
