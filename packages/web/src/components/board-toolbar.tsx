'use client';

import { useState } from 'react';
import type {
  PositionFilterGroup,
  Position,
  CustomPlayer,
} from '@mockingboard/shared';
import { Button } from '@/components/ui/button';

const FILTER_LABELS: Record<Exclude<PositionFilterGroup, null>, string> = {
  QB: 'QB',
  WR_TE: 'WR/TE',
  RB: 'RB',
  OL: 'OL',
  DEF: 'DEF',
};

interface BoardToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  posFilter: PositionFilterGroup;
  onPosFilterChange: (value: PositionFilterGroup) => void;
  isSaving: boolean;
  isDirty: boolean;
  onAddCustomPlayer: (player: CustomPlayer) => void;
}

export function BoardToolbar({
  search,
  onSearchChange,
  posFilter,
  onPosFilterChange,
  isSaving,
  isDirty,
  onAddCustomPlayer,
}: BoardToolbarProps) {
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customPosition, setCustomPosition] = useState<Position>('QB');
  const [customSchool, setCustomSchool] = useState('');

  function handleAddCustom() {
    if (!customName.trim()) return;
    onAddCustomPlayer({
      id: `custom_${Date.now()}`,
      name: customName.trim(),
      position: customPosition,
      school: customSchool.trim(),
    });
    setCustomName('');
    setCustomSchool('');
    setShowCustomForm(false);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <input
          type="text"
          placeholder="Search players..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="flex-1 rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <span className="text-xs text-muted-foreground">
          {isSaving ? 'Saving...' : isDirty ? 'Unsaved' : 'Saved'}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <Button
          variant={posFilter === null ? 'default' : 'outline'}
          size="xs"
          onClick={() => onPosFilterChange(null)}
        >
          All
        </Button>
        {(
          Object.keys(FILTER_LABELS) as Exclude<PositionFilterGroup, null>[]
        ).map((group) => (
          <Button
            key={group}
            variant={posFilter === group ? 'default' : 'outline'}
            size="xs"
            onClick={() => onPosFilterChange(group)}
          >
            {FILTER_LABELS[group]}
          </Button>
        ))}

        <div className="flex-1" />

        <Button
          variant="outline"
          size="xs"
          onClick={() => setShowCustomForm(!showCustomForm)}
        >
          {showCustomForm ? 'Cancel' : '+ Custom Player'}
        </Button>
      </div>

      {showCustomForm && (
        <div className="flex flex-wrap items-end gap-2 rounded-md border bg-muted/50 p-3">
          <div className="flex-1">
            <label className="mb-1 block text-xs text-muted-foreground">
              Name
            </label>
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              className="w-full rounded-md border bg-background px-2 py-1 text-sm"
              placeholder="Player name"
            />
          </div>
          <div className="w-20">
            <label className="mb-1 block text-xs text-muted-foreground">
              Pos
            </label>
            <select
              value={customPosition}
              onChange={(e) => setCustomPosition(e.target.value as Position)}
              className="w-full rounded-md border bg-background px-2 py-1 text-sm"
            >
              {(
                [
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
                ] as Position[]
              ).map((pos) => (
                <option key={pos} value={pos}>
                  {pos}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs text-muted-foreground">
              School
            </label>
            <input
              type="text"
              value={customSchool}
              onChange={(e) => setCustomSchool(e.target.value)}
              className="w-full rounded-md border bg-background px-2 py-1 text-sm"
              placeholder="School"
            />
          </div>
          <Button
            size="sm"
            onClick={handleAddCustom}
            disabled={!customName.trim()}
          >
            Add
          </Button>
        </div>
      )}
    </div>
  );
}
