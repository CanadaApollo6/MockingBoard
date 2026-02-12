'use client';

import { useState, useCallback } from 'react';
import { teams } from '@mockingboard/shared';
import type { TeamAbbreviation } from '@mockingboard/shared';
import { TEAM_COLORS } from '@/lib/colors/team-colors';
import { ChevronDown } from 'lucide-react';
import { useClickOutside } from '@/hooks/use-click-outside';
import { cn } from '@/lib/utils';

interface TeamSelectProps {
  value: TeamAbbreviation | null;
  onSelect: (team: TeamAbbreviation) => void;
}

const afcTeams = teams.filter((t) => t.conference === 'AFC');
const nfcTeams = teams.filter((t) => t.conference === 'NFC');

export function TeamSelect({ value, onSelect }: TeamSelectProps) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const ref = useClickOutside<HTMLDivElement>(close);

  const selected = value ? teams.find((t) => t.id === value) : null;
  const colors = value ? TEAM_COLORS[value] : null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex w-full items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-accent',
          open && 'ring-2 ring-ring ring-offset-2 ring-offset-background',
        )}
        style={
          colors
            ? { borderLeftWidth: '3px', borderLeftColor: colors.primary }
            : undefined
        }
      >
        {colors && (
          <span
            className="size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: colors.primary }}
          />
        )}
        <span
          className={cn(
            'flex-1 text-left',
            !selected && 'text-muted-foreground',
          )}
        >
          {selected ? selected.name : 'Select team\u2026'}
        </span>
        <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-72 rounded-md border bg-card p-2 shadow-lg">
          <ConferenceGroup
            label="AFC"
            teams={afcTeams}
            selected={value}
            onSelect={(t) => {
              onSelect(t);
              setOpen(false);
            }}
          />
          <div className="my-1.5" />
          <ConferenceGroup
            label="NFC"
            teams={nfcTeams}
            selected={value}
            onSelect={(t) => {
              onSelect(t);
              setOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}

function ConferenceGroup({
  label,
  teams: confTeams,
  selected,
  onSelect,
}: {
  label: string;
  teams: typeof teams;
  selected: TeamAbbreviation | null;
  onSelect: (team: TeamAbbreviation) => void;
}) {
  return (
    <div>
      <p className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <div className="grid grid-cols-4 gap-0.5">
        {confTeams.map((t) => {
          const c = TEAM_COLORS[t.id];
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onSelect(t.id)}
              title={t.name}
              className={cn(
                'flex items-center gap-1.5 rounded px-2 py-1 text-xs transition-colors hover:bg-accent',
                selected === t.id && 'bg-accent font-medium',
              )}
            >
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: c.primary }}
              />
              {t.id}
            </button>
          );
        })}
      </div>
    </div>
  );
}
