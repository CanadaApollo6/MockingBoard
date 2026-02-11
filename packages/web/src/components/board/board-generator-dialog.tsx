'use client';

import { useState, useMemo } from 'react';
import type {
  Player,
  Position,
  BoardGenerationConfig,
} from '@mockingboard/shared';
import { generateBoardRankings, getHeadlineStats } from '@mockingboard/shared';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ChevronDown, ChevronRight, Sparkles } from 'lucide-react';

const POSITIONS: (Position | 'ALL')[] = [
  'ALL',
  'QB',
  'RB',
  'WR',
  'TE',
  'OT',
  'OG',
  'C',
  'EDGE',
  'DL',
  'LB',
  'CB',
  'S',
];

const POSITION_LABELS: Record<string, string> = {
  ALL: 'All Positions',
  QB: 'Quarterback',
  RB: 'Running Back',
  WR: 'Wide Receiver',
  TE: 'Tight End',
  OT: 'Offensive Tackle',
  OG: 'Offensive Guard',
  C: 'Center',
  EDGE: 'Edge Rusher',
  DL: 'Defensive Line',
  LB: 'Linebacker',
  CB: 'Cornerback',
  S: 'Safety',
};

interface BoardGeneratorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  players: Record<string, Player>;
  onGenerate: (rankings: string[]) => void;
}

export function BoardGeneratorDialog({
  open,
  onOpenChange,
  players,
  onGenerate,
}: BoardGeneratorDialogProps) {
  const [position, setPosition] = useState<Position | 'ALL'>('ALL');
  const [production, setProduction] = useState(40);
  const [athleticism, setAthleticism] = useState(25);
  const [conference, setConference] = useState(15);
  const [consensus, setConsensus] = useState(20);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [statOverrides, setStatOverrides] = useState<Record<string, number>>(
    {},
  );

  const headlineStats = useMemo(
    () => (position !== 'ALL' ? getHeadlineStats(position) : []),
    [position],
  );

  // Format stat key for display: "pass_grd" → "Pass Grd"
  const formatStatKey = (key: string) =>
    key
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

  const handleGenerate = () => {
    const config: BoardGenerationConfig = {
      position,
      weights: { production, athleticism, conference, consensus },
      ...(Object.keys(statOverrides).length > 0 ? { statOverrides } : {}),
    };
    const playerArr = Object.values(players);
    const rankings = generateBoardRankings(playerArr, config);
    onGenerate(rankings);
    onOpenChange(false);
  };

  const handlePositionChange = (pos: Position | 'ALL') => {
    setPosition(pos);
    setStatOverrides({});
    setAdvancedOpen(false);
  };

  const totalWeight = production + athleticism + conference + consensus;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Generate Board from Weights
          </DialogTitle>
          <DialogDescription>
            Adjust how much each factor influences your rankings.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Position selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Position</label>
            <div className="flex flex-wrap gap-1.5">
              {POSITIONS.map((pos) => (
                <Button
                  key={pos}
                  variant={position === pos ? 'default' : 'outline'}
                  size="xs"
                  onClick={() => handlePositionChange(pos)}
                >
                  {pos}
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {POSITION_LABELS[position]}
              {position !== 'ALL' &&
                ` — ${Object.values(players).filter((p) => p.position === position).length} prospects`}
            </p>
          </div>

          {/* Weight sliders */}
          <div className="space-y-5">
            <WeightSlider
              label="Production"
              description="PFF grades and key performance stats"
              value={production}
              onChange={setProduction}
            />
            <WeightSlider
              label="Athleticism"
              description="Combine and pro day measurements"
              value={athleticism}
              onChange={setAthleticism}
            />
            <WeightSlider
              label="Conference"
              description="Strength of competition level"
              value={conference}
              onChange={setConference}
            />
            <WeightSlider
              label="Consensus"
              description="Industry-wide draft ranking"
              value={consensus}
              onChange={setConsensus}
            />
          </div>

          {totalWeight === 0 && (
            <p className="text-sm text-destructive">
              At least one weight must be greater than zero.
            </p>
          )}

          {/* Advanced: stat overrides */}
          {position !== 'ALL' && headlineStats.length > 0 && (
            <div className="rounded-md border">
              <button
                className="flex w-full items-center justify-between px-3 py-2.5 text-sm font-medium hover:bg-muted/50"
                onClick={() => setAdvancedOpen(!advancedOpen)}
              >
                <span>Advanced: Stat Weights</span>
                {advancedOpen ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
              {advancedOpen && (
                <div className="space-y-4 border-t px-3 py-3">
                  <p className="text-xs text-muted-foreground">
                    Override which stats matter most for {position}. Overrides
                    replace the default headline stats.
                  </p>
                  {headlineStats.map((key) => (
                    <div key={key} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium">
                          {formatStatKey(key)}
                        </span>
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {statOverrides[key] ?? 50}
                        </span>
                      </div>
                      <Slider
                        min={0}
                        max={100}
                        step={5}
                        value={[statOverrides[key] ?? 50]}
                        onValueChange={([v]) =>
                          setStatOverrides((prev) => ({ ...prev, [key]: v }))
                        }
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleGenerate} disabled={totalWeight === 0}>
            <Sparkles className="mr-1.5 h-4 w-4" />
            Generate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---- Weight Slider ----

interface WeightSliderProps {
  label: string;
  description: string;
  value: number;
  onChange: (value: number) => void;
}

function WeightSlider({
  label,
  description,
  value,
  onChange,
}: WeightSliderProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm font-medium">{label}</span>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <span className="min-w-[3ch] text-right text-sm tabular-nums text-muted-foreground">
          {value}
        </span>
      </div>
      <Slider
        min={0}
        max={100}
        step={5}
        value={[value]}
        onValueChange={([v]) => onChange(v)}
      />
    </div>
  );
}
