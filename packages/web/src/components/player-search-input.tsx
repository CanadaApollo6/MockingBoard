'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import type { TeamAbbreviation } from '@mockingboard/shared';

export interface PlayerSearchResult {
  gsisId: string;
  name: string;
  position: string;
  jersey: string;
  college: string;
  team: string;
  yearsExp: number;
}

interface PlayerSearchInputProps {
  team: TeamAbbreviation;
  onSelect: (player: PlayerSearchResult) => void;
  placeholder?: string;
}

export function PlayerSearchInput({
  team,
  onSelect,
  placeholder = 'Search players...',
}: PlayerSearchInputProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlayerSearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);

  const search = useCallback(
    async (q: string) => {
      if (q.length < 2) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(
          `/api/admin/player-search?q=${encodeURIComponent(q)}&team=${team}`,
        );
        const data = await res.json();
        setResults(data.results ?? []);
        setIsOpen(true);
      } finally {
        setLoading(false);
      }
    },
    [team],
  );

  const handleChange = (value: string) => {
    setQuery(value);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => search(value), 300);
  };

  const handleSelect = (player: PlayerSearchResult) => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    onSelect(player);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />
      {loading && (
        <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">
          ...
        </span>
      )}
      {isOpen && results.length > 0 && (
        <ul className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover shadow-md">
          {results.map((player) => (
            <li key={player.gsisId}>
              <button
                type="button"
                onClick={() => handleSelect(player)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted/50"
              >
                <span className="font-medium">{player.name}</span>
                <span className="text-muted-foreground">
                  {player.position} #{player.jersey}
                </span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {player.college}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
