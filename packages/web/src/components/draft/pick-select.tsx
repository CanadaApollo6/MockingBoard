'use client';

import { useState, useMemo, useCallback } from 'react';
import type { TeamAbbreviation } from '@mockingboard/shared';
import { TEAM_COLORS } from '@/lib/colors/team-colors';
import { getTeamName } from '@/lib/teams';
import { ChevronDown } from 'lucide-react';
import { useClickOutside } from '@/hooks/use-click-outside';
import { cn } from '@/lib/utils';

interface SlotInfo {
  overall: number;
  round: number;
  pick: number;
  team: string;
}

interface PickSelectProps {
  slots: SlotInfo[];
  value: string;
  onSelect: (overall: string) => void;
  placeholder?: string;
}

export function PickSelect({
  slots,
  value,
  onSelect,
  placeholder = 'Select pick\u2026',
}: PickSelectProps) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const ref = useClickOutside<HTMLDivElement>(close);

  const picksByRound = useMemo(() => {
    const map = new Map<number, SlotInfo[]>();
    for (const s of slots) {
      const items = map.get(s.round) ?? [];
      items.push(s);
      map.set(s.round, items);
    }
    return map;
  }, [slots]);

  const selectedSlot = value
    ? slots.find((s) => String(s.overall) === value)
    : null;

  const selectedLabel = selectedSlot
    ? `${selectedSlot.round}.${String(selectedSlot.pick).padStart(2, '0')} — ${getTeamName(selectedSlot.team as TeamAbbreviation)} (#${selectedSlot.overall})`
    : null;

  return (
    <div ref={ref} className="relative flex-1">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex w-full items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-accent',
          open && 'ring-2 ring-ring ring-offset-2 ring-offset-background',
        )}
      >
        <span
          className={cn(
            'flex-1 truncate text-left',
            !selectedLabel && 'text-muted-foreground',
          )}
        >
          {selectedLabel ?? placeholder}
        </span>
        <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-md border bg-card p-1 shadow-lg">
          {Array.from(picksByRound.entries()).map(([round, roundPicks]) => (
            <div key={round}>
              <p className="sticky top-0 bg-card px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Round {round}
              </p>
              {roundPicks.map((s) => {
                const colors = TEAM_COLORS[s.team as TeamAbbreviation];
                const isSelected = String(s.overall) === value;
                return (
                  <button
                    key={s.overall}
                    type="button"
                    onClick={() => {
                      onSelect(String(s.overall));
                      setOpen(false);
                    }}
                    className={cn(
                      'flex w-full items-center gap-2 rounded px-2 py-1 text-xs transition-colors hover:bg-accent',
                      isSelected && 'bg-accent font-medium',
                    )}
                    style={{
                      borderLeft: `3px solid ${colors?.primary ?? 'transparent'}`,
                    }}
                  >
                    <span className="font-mono">
                      {round}.{String(s.pick).padStart(2, '0')}
                    </span>
                    <span className="text-muted-foreground">
                      {getTeamName(s.team as TeamAbbreviation)}
                    </span>
                    <span className="ml-auto font-mono text-muted-foreground">
                      #{s.overall}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
          {slots.length === 0 && (
            <p className="px-2 py-3 text-center text-xs text-muted-foreground">
              No picks available
            </p>
          )}
        </div>
      )}
    </div>
  );
}
