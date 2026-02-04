'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { PdfDepth } from './draft-guide-pdf';

interface DraftGuideOptionsProps {
  totalPlayers: number;
  onGenerate: (depth: PdfDepth, playerCount: number) => void;
  onCancel: () => void;
}

const DEPTH_OPTIONS: { value: PdfDepth; label: string; description: string }[] =
  [
    {
      value: 'skim',
      label: 'Quick Look',
      description: 'Rank, name, position, school',
    },
    {
      value: 'peruse',
      label: 'Detailed',
      description: 'Adds height/weight, NFL comp, strengths/weaknesses',
    },
    {
      value: 'deep-dive',
      label: 'Full Breakdown',
      description: 'Full scouting profile with measurables and summary',
    },
  ];

export function DraftGuideOptions({
  totalPlayers,
  onGenerate,
  onCancel,
}: DraftGuideOptionsProps) {
  const [depth, setDepth] = useState<PdfDepth>('peruse');
  const [countMode, setCountMode] = useState<'all' | 'top'>('all');
  const [topN, setTopN] = useState(32);

  const playerCount =
    countMode === 'all' ? totalPlayers : Math.min(topN, totalPlayers);

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-2 block text-sm font-medium">Detail Level</label>
        <div className="space-y-1.5">
          {DEPTH_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors ${
                depth === opt.value
                  ? 'border-ring bg-accent/50'
                  : 'hover:bg-muted/50'
              }`}
            >
              <input
                type="radio"
                name="depth"
                value={opt.value}
                checked={depth === opt.value}
                onChange={() => setDepth(opt.value)}
                className="mt-0.5"
              />
              <div>
                <span className="text-sm font-medium">{opt.label}</span>
                <p className="text-xs text-muted-foreground">
                  {opt.description}
                </p>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">Players</label>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={countMode === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCountMode('all')}
          >
            All ({totalPlayers})
          </Button>
          <Button
            type="button"
            variant={countMode === 'top' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCountMode('top')}
          >
            Top N
          </Button>
          {countMode === 'top' && (
            <input
              type="number"
              value={topN}
              onChange={(e) =>
                setTopN(Math.max(1, parseInt(e.target.value) || 1))
              }
              min={1}
              max={totalPlayers}
              className="w-20 rounded-md border bg-background px-2 py-1 text-sm"
            />
          )}
        </div>
      </div>

      <div className="flex items-center justify-between border-t pt-3">
        <p className="text-xs text-muted-foreground">
          {playerCount} player{playerCount !== 1 ? 's' : ''} &bull;{' '}
          {depth === 'skim'
            ? 'Quick Look'
            : depth === 'peruse'
              ? 'Detailed'
              : 'Full Breakdown'}
        </p>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button size="sm" onClick={() => onGenerate(depth, playerCount)}>
            Generate PDF
          </Button>
        </div>
      </div>
    </div>
  );
}
