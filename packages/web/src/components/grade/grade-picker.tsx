'use client';

import {
  GRADE_SYSTEMS,
  getGradeOptions,
  type GradeSystem,
} from '@mockingboard/shared';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

interface GradePickerProps {
  value: number | undefined;
  system: GradeSystem;
  onChangeValue: (value: number | undefined) => void;
  onChangeSystem: (system: GradeSystem) => void;
}

function OptionGrid({
  system,
  value,
  onSelect,
}: {
  system: GradeSystem;
  value: number | undefined;
  onSelect: (v: number | undefined) => void;
}) {
  const options = getGradeOptions(system);

  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const isActive = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onSelect(isActive ? undefined : opt.value)}
            className={cn(
              'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
              isActive
                ? `${opt.bg} ${opt.color}`
                : 'border-transparent bg-muted text-muted-foreground hover:text-foreground',
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export function GradePicker({
  value,
  system,
  onChangeValue,
  onChangeSystem,
}: GradePickerProps) {
  return (
    <Tabs
      value={system}
      onValueChange={(v) => onChangeSystem(v as GradeSystem)}
    >
      <TabsList className="w-full">
        {GRADE_SYSTEMS.map((s) => (
          <TabsTrigger key={s.id} value={s.id} className="flex-1 text-xs">
            {s.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {GRADE_SYSTEMS.map((s) => (
        <TabsContent key={s.id} value={s.id}>
          <OptionGrid system={s.id} value={value} onSelect={onChangeValue} />
        </TabsContent>
      ))}
    </Tabs>
  );
}
