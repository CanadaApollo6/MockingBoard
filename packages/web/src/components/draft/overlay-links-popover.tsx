'use client';

import { useState, useCallback } from 'react';
import { Tv, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover';
import { Routes } from '@/routes';

const OVERLAY_TYPES = [
  {
    type: 'board' as const,
    label: 'Draft Board',
    description: 'Full board with all picks',
  },
  {
    type: 'ticker' as const,
    label: 'Pick Ticker',
    description: 'Scrolling recent picks',
  },
  {
    type: 'current-pick' as const,
    label: 'Current Pick',
    description: 'Single pick card',
  },
];

interface OverlayLinksPopoverProps {
  draftId: string;
}

export function OverlayLinksPopover({ draftId }: OverlayLinksPopoverProps) {
  const [copiedType, setCopiedType] = useState<string | null>(null);

  const copyUrl = useCallback(
    (type: 'board' | 'ticker' | 'current-pick') => {
      const path = Routes.overlay(draftId, type);
      const url = `${window.location.origin}${path}?theme=transparent`;
      navigator.clipboard.writeText(url);
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2000);
    },
    [draftId],
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm">
          <Tv className="mr-1.5 h-4 w-4" />
          Overlays
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80">
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium">Stream Overlays</p>
            <p className="text-xs text-muted-foreground">
              Copy a URL and add it as a browser source in OBS.
            </p>
          </div>
          {OVERLAY_TYPES.map(({ type, label, description }) => (
            <div
              key={type}
              className="flex items-center justify-between gap-2 rounded-md border px-3 py-2"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0"
                onClick={() => copyUrl(type)}
              >
                {copiedType === type ? (
                  <Check className="h-4 w-4 text-mb-accent" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          ))}
          <p className="text-xs text-muted-foreground">
            URLs use a transparent background by default. Change{' '}
            <code className="rounded bg-muted px-1">theme=transparent</code> to{' '}
            <code className="rounded bg-muted px-1">dark</code> or{' '}
            <code className="rounded bg-muted px-1">light</code> if needed.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
