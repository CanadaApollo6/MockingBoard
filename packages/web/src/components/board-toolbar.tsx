'use client';

import { useState } from 'react';
import type {
  Position,
  CustomPlayer,
  BoardVisibility,
} from '@mockingboard/shared';
import { Button } from '@/components/ui/button';

const POSITIONS: Position[] = [
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

interface BoardToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  posFilter: Position | null;
  onPosFilterChange: (value: Position | null) => void;
  isSaving: boolean;
  isDirty: boolean;
  onAddCustomPlayer: (player: CustomPlayer) => void;
  onSaveSnapshot: (label: string) => Promise<void>;
  visibility?: BoardVisibility;
  slug?: string;
  description?: string;
  onVisibilityChange?: (
    visibility: BoardVisibility,
    slug: string,
    description: string,
  ) => void;
}

export function BoardToolbar({
  search,
  onSearchChange,
  posFilter,
  onPosFilterChange,
  isSaving,
  isDirty,
  onAddCustomPlayer,
  onSaveSnapshot,
  visibility,
  slug,
  description,
  onVisibilityChange,
}: BoardToolbarProps) {
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [showSnapshotForm, setShowSnapshotForm] = useState(false);
  const [showShareForm, setShowShareForm] = useState(false);
  const [snapshotLabel, setSnapshotLabel] = useState('');
  const [savingSnapshot, setSavingSnapshot] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customPosition, setCustomPosition] = useState<Position>('QB');
  const [customSchool, setCustomSchool] = useState('');
  const [editSlug, setEditSlug] = useState(slug ?? '');
  const [editDescription, setEditDescription] = useState(description ?? '');
  const [editVisibility, setEditVisibility] = useState<BoardVisibility>(
    visibility ?? 'private',
  );

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

  async function handleSaveSnapshot() {
    setSavingSnapshot(true);
    try {
      await onSaveSnapshot(snapshotLabel.trim());
      setSnapshotLabel('');
      setShowSnapshotForm(false);
    } finally {
      setSavingSnapshot(false);
    }
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
        {POSITIONS.map((pos) => (
          <Button
            key={pos}
            variant={posFilter === pos ? 'default' : 'outline'}
            size="xs"
            onClick={() => onPosFilterChange(pos)}
          >
            {pos}
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
        <Button
          variant="outline"
          size="xs"
          onClick={() => setShowSnapshotForm(!showSnapshotForm)}
        >
          {showSnapshotForm ? 'Cancel' : 'Save Snapshot'}
        </Button>
        {onVisibilityChange && (
          <Button
            variant={visibility === 'public' ? 'default' : 'outline'}
            size="xs"
            onClick={() => setShowShareForm(!showShareForm)}
          >
            {showShareForm
              ? 'Cancel'
              : visibility === 'public'
                ? 'Public'
                : 'Share'}
          </Button>
        )}
      </div>

      {showSnapshotForm && (
        <div className="flex items-end gap-2 rounded-md border bg-muted/50 p-3">
          <div className="flex-1">
            <label className="mb-1 block text-xs text-muted-foreground">
              Label (optional)
            </label>
            <input
              type="text"
              value={snapshotLabel}
              onChange={(e) => setSnapshotLabel(e.target.value)}
              className="w-full rounded-md border bg-background px-2 py-1 text-sm"
              placeholder="e.g. Pre-Combine"
            />
          </div>
          <Button
            size="sm"
            onClick={handleSaveSnapshot}
            disabled={savingSnapshot}
          >
            {savingSnapshot ? 'Saving...' : 'Save'}
          </Button>
        </div>
      )}

      {showShareForm && onVisibilityChange && (
        <div className="space-y-2 rounded-md border bg-muted/50 p-3">
          <div className="flex items-center gap-3">
            <label className="text-xs font-medium text-muted-foreground">
              Visibility
            </label>
            <div className="flex gap-1">
              <Button
                type="button"
                variant={editVisibility === 'private' ? 'default' : 'outline'}
                size="xs"
                onClick={() => setEditVisibility('private')}
              >
                Private
              </Button>
              <Button
                type="button"
                variant={editVisibility === 'public' ? 'default' : 'outline'}
                size="xs"
                onClick={() => setEditVisibility('public')}
              >
                Public
              </Button>
            </div>
          </div>
          {editVisibility === 'public' && (
            <>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  URL Slug
                </label>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">
                    /boards/
                  </span>
                  <input
                    type="text"
                    value={editSlug}
                    onChange={(e) =>
                      setEditSlug(
                        e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9-]/g, '-')
                          .replace(/-+/g, '-'),
                      )
                    }
                    className="flex-1 rounded-md border bg-background px-2 py-1 text-sm"
                    placeholder="my-2026-board"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  Description
                </label>
                <input
                  type="text"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full rounded-md border bg-background px-2 py-1 text-sm"
                  placeholder="A short description of your board"
                  maxLength={200}
                />
              </div>
            </>
          )}
          <Button
            size="sm"
            onClick={() => {
              onVisibilityChange(editVisibility, editSlug, editDescription);
              setShowShareForm(false);
            }}
            disabled={editVisibility === 'public' && !editSlug.trim()}
          >
            Save
          </Button>
          {visibility === 'public' && slug && (
            <p className="text-xs text-muted-foreground">
              Visible at{' '}
              <a
                href={`/boards/${slug}`}
                className="text-mb-accent hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                /boards/{slug}
              </a>
            </p>
          )}
        </div>
      )}

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
