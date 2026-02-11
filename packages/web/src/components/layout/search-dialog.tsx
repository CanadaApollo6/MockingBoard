'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  Search,
  User,
  Users,
  LayoutList,
  Eye,
  GalleryHorizontalEnd,
  Shirt,
  Loader2,
} from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import type { SearchResult } from '@/app/api/search/route';

const TYPE_META: Record<
  SearchResult['type'],
  { label: string; icon: typeof Search }
> = {
  player: { label: 'Prospects', icon: Users },
  'nfl-player': { label: 'NFL Players', icon: Shirt },
  team: { label: 'Teams', icon: GalleryHorizontalEnd },
  user: { label: 'Users', icon: User },
  board: { label: 'Boards', icon: LayoutList },
  scout: { label: 'Scouts', icon: Eye },
};

const TYPE_ORDER: SearchResult['type'][] = [
  'player',
  'nfl-player',
  'team',
  'user',
  'board',
  'scout',
];

interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SearchDialog({ open, onOpenChange }: SearchDialogProps) {
  const router = useRouter();
  const pathname = usePathname();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  // Close on navigation
  useEffect(() => {
    onOpenChange(false);
  }, [pathname]);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setQuery('');
      setResults([]);
      setActiveIndex(0);
      // Focus input after animation
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(query.trim())}`,
          { signal: controller.signal },
        );
        if (res.ok) {
          const data = (await res.json()) as { results: SearchResult[] };
          setResults(data.results);
          setActiveIndex(0);
        }
      } catch {
        // Aborted or network error — ignore
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const navigate = useCallback(
    (href: string) => {
      onOpenChange(false);
      router.push(href);
    },
    [router, onOpenChange],
  );

  // Group results by type in display order
  const grouped = TYPE_ORDER.map((type) => ({
    type,
    items: results.filter((r) => r.type === type),
  })).filter((g) => g.items.length > 0);

  const flatResults = grouped.flatMap((g) => g.items);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % Math.max(flatResults.length, 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(
        (i) => (i - 1 + flatResults.length) % Math.max(flatResults.length, 1),
      );
    } else if (e.key === 'Enter' && flatResults[activeIndex]) {
      e.preventDefault();
      navigate(flatResults[activeIndex].href);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="top-[20%] max-w-lg translate-y-0 gap-0 overflow-hidden p-0 data-[state=open]:slide-in-from-top-[18%] data-[state=closed]:slide-out-to-top-[18%]"
        onKeyDown={handleKeyDown}
      >
        <DialogTitle className="sr-only">Search</DialogTitle>
        {/* Search input */}
        <div className="flex items-center gap-3 border-b px-4">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search players, teams, users..."
            className="flex-1 bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
          />
          {loading && (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
          )}
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto">
          {query.trim().length >= 2 && !loading && flatResults.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              No results found
            </p>
          )}

          {grouped.map((group) => {
            const meta = TYPE_META[group.type];
            return (
              <div key={group.type}>
                <p className="px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {meta.label}
                </p>
                {group.items.map((item) => {
                  const idx = flatResults.indexOf(item);
                  const Icon = meta.icon;
                  return (
                    <button
                      key={`${item.type}-${item.id}`}
                      onClick={() => navigate(item.href)}
                      onMouseEnter={() => setActiveIndex(idx)}
                      className={`flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors ${
                        idx === activeIndex
                          ? 'bg-accent text-accent-foreground'
                          : 'text-foreground hover:bg-accent/50'
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <span className="font-medium">{item.name}</span>
                        <span className="ml-2 text-xs text-muted-foreground">
                          {item.description}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Footer hint */}
        {flatResults.length > 0 && (
          <div className="flex items-center gap-3 border-t px-4 py-2 text-[11px] text-muted-foreground">
            <span>
              <kbd className="rounded border bg-muted px-1 py-0.5 font-mono text-[10px]">
                ↑↓
              </kbd>{' '}
              navigate
            </span>
            <span>
              <kbd className="rounded border bg-muted px-1 py-0.5 font-mono text-[10px]">
                ↵
              </kbd>{' '}
              select
            </span>
            <span>
              <kbd className="rounded border bg-muted px-1 py-0.5 font-mono text-[10px]">
                esc
              </kbd>{' '}
              close
            </span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
