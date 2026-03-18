'use client';

import {
  useState,
  useMemo,
  useCallback,
  useRef,
  useId,
  useEffect,
} from 'react';
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
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const listboxId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setIsOpen(false);
    setActiveIndex(-1);
  }, []);
  const containerRef = useClickOutside<HTMLDivElement>(close);

  const picksByRound = useMemo(() => {
    const map = new Map<number, SlotInfo[]>();
    for (const s of slots) {
      const items = map.get(s.round) ?? [];
      items.push(s);
      map.set(s.round, items);
    }
    return map;
  }, [slots]);

  // Flat list for keyboard navigation
  const flatSlots = useMemo(() => [...slots], [slots]);

  const selectedSlot = value
    ? slots.find((s) => String(s.overall) === value)
    : null;

  const selectedLabel = selectedSlot
    ? `${selectedSlot.round}.${String(selectedSlot.pick).padStart(2, '0')} — ${getTeamName(selectedSlot.team as TeamAbbreviation)} (#${selectedSlot.overall})`
    : null;

  const activeOptionId =
    activeIndex >= 0 && activeIndex < flatSlots.length
      ? `${listboxId}-option-${flatSlots[activeIndex].overall}`
      : undefined;

  // Scroll active option into view
  useEffect(() => {
    if (!isOpen || activeIndex < 0) return;
    const option = listRef.current?.querySelector(
      `#${CSS.escape(activeOptionId ?? '')}`,
    );
    option?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, isOpen, activeOptionId]);

  function handleKeyDown(e: React.KeyboardEvent) {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          setActiveIndex(0);
        } else {
          setActiveIndex((i) => Math.min(i + 1, flatSlots.length - 1));
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (isOpen) {
          setActiveIndex((i) => Math.max(i - 1, 0));
        }
        break;
      case 'Home':
        if (isOpen) {
          e.preventDefault();
          setActiveIndex(0);
        }
        break;
      case 'End':
        if (isOpen) {
          e.preventDefault();
          setActiveIndex(flatSlots.length - 1);
        }
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (isOpen && activeIndex >= 0 && activeIndex < flatSlots.length) {
          onSelect(String(flatSlots[activeIndex].overall));
          close();
          triggerRef.current?.focus();
        } else if (!isOpen) {
          setIsOpen(true);
          setActiveIndex(0);
        }
        break;
      case 'Escape':
        if (isOpen) {
          e.preventDefault();
          close();
          triggerRef.current?.focus();
        }
        break;
    }
  }

  return (
    <div
      ref={containerRef}
      className="relative flex-1"
      onKeyDown={handleKeyDown}
    >
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-activedescendant={isOpen ? activeOptionId : undefined}
        onClick={() => {
          setIsOpen((o) => !o);
          if (!isOpen) setActiveIndex(0);
        }}
        className={cn(
          'flex w-full items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-accent',
          isOpen && 'ring-2 ring-ring ring-offset-2 ring-offset-background',
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

      {isOpen && (
        <div
          ref={listRef}
          id={listboxId}
          role="listbox"
          aria-label="Draft picks"
          className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-md border bg-card p-1 shadow-lg"
        >
          {Array.from(picksByRound.entries()).map(([round, roundPicks]) => (
            <div key={round} role="group" aria-label={`Round ${round}`}>
              <p className="sticky top-0 bg-card px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Round {round}
              </p>
              {roundPicks.map((s) => {
                const colors = TEAM_COLORS[s.team as TeamAbbreviation];
                const isSelected = String(s.overall) === value;
                const isActive =
                  activeIndex >= 0 &&
                  activeIndex < flatSlots.length &&
                  flatSlots[activeIndex].overall === s.overall;
                return (
                  <button
                    key={s.overall}
                    id={`${listboxId}-option-${s.overall}`}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onSelect(String(s.overall));
                      close();
                      triggerRef.current?.focus();
                    }}
                    className={cn(
                      'flex w-full items-center gap-2 rounded px-2 py-1 text-xs transition-colors hover:bg-accent',
                      isSelected && 'bg-accent font-medium',
                      isActive && 'ring-2 ring-ring',
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
