'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import type {
  Player,
  Position,
  BigBoard,
  BoardSnapshot,
  CustomPlayer,
} from '@mockingboard/shared';
import { useBigBoard } from '@/hooks/use-big-board';
import { BoardPlayerRow } from '@/components/board-player-row';
import { BoardToolbar } from '@/components/board-toolbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getPositionColor } from '@/lib/position-colors';
interface BoardEditorProps {
  players: Record<string, Player>;
  initialBoard: BigBoard | null;
  year: number;
}

export function BoardEditor({ players, initialBoard, year }: BoardEditorProps) {
  const [board, setBoard] = useState<BigBoard | null>(initialBoard);
  const [isCreating, setIsCreating] = useState(false);
  const [restoreKey, setRestoreKey] = useState(0);

  async function handleRestore(snapshotRankings: string[]) {
    if (!board) return;
    await fetch(`/api/boards/${board.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rankings: snapshotRankings }),
    });
    setBoard({ ...board, rankings: snapshotRankings });
    setRestoreKey((k) => k + 1);
  }

  const sortedPlayers = useMemo(
    () =>
      Object.values(players).sort((a, b) => a.consensusRank - b.consensusRank),
    [players],
  );

  async function handleCreate(basedOn: 'consensus' | 'blank') {
    setIsCreating(true);
    try {
      const initialRankings =
        basedOn === 'consensus' ? sortedPlayers.map((p) => p.id) : [];

      const res = await fetch('/api/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `My ${year} Board`,
          year,
          basedOn,
          rankings: initialRankings,
        }),
      });

      if (!res.ok) throw new Error('Failed to create board');
      const created: BigBoard = await res.json();
      setBoard(created);
    } catch (err) {
      console.error('Failed to create board:', err);
    } finally {
      setIsCreating(false);
    }
  }

  if (!board) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <h2 className="mb-2 text-xl font-bold">Create Your Big Board</h2>
        <p className="mb-8 text-sm text-muted-foreground">
          Rank {sortedPlayers.length} prospects your way.
        </p>
        <div className="flex gap-4">
          <Button
            onClick={() => handleCreate('consensus')}
            disabled={isCreating}
          >
            Start from Consensus
          </Button>
          <Button
            variant="outline"
            onClick={() => handleCreate('blank')}
            disabled={isCreating}
          >
            Start Blank
          </Button>
        </div>
        {isCreating && (
          <p className="mt-4 text-sm text-muted-foreground">
            Creating board...
          </p>
        )}
      </div>
    );
  }

  return (
    <BoardEditorInner
      key={`${board.id}-${restoreKey}`}
      board={board}
      players={players}
      sortedPlayers={sortedPlayers}
      onRestore={handleRestore}
    />
  );
}

/* ------------------------------------------------------------------ */

interface BoardEditorInnerProps {
  board: BigBoard;
  players: Record<string, Player>;
  sortedPlayers: Player[];
  onRestore: (rankings: string[]) => Promise<void>;
}

function BoardEditorInner({
  board,
  players,
  sortedPlayers,
  onRestore,
}: BoardEditorInnerProps) {
  const [search, setSearch] = useState('');
  const [posFilter, setPosFilter] = useState<Position | null>(null);
  const [poolSearch, setPoolSearch] = useState('');
  const [poolPosFilter, setPoolPosFilter] = useState<Position | null>(null);
  const [snapshots, setSnapshots] = useState<BoardSnapshot[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const fetchSnapshots = useCallback(async () => {
    try {
      const res = await fetch(`/api/boards/${board.id}/snapshots`);
      if (!res.ok) return;
      const data = await res.json();
      setSnapshots(data.snapshots ?? []);
    } catch {
      /* ignore */
    }
  }, [board.id]);

  useEffect(() => {
    fetchSnapshots();
  }, [fetchSnapshots]);

  async function handleSaveSnapshot(label: string) {
    const res = await fetch(`/api/boards/${board.id}/snapshots`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: label || undefined }),
    });
    if (res.ok) await fetchSnapshots();
  }

  async function handleRestore(snapshot: BoardSnapshot) {
    if (
      !window.confirm(
        'Restore this snapshot? Your current rankings will be overwritten.',
      )
    )
      return;
    setRestoringId(snapshot.id);
    try {
      await onRestore(snapshot.rankings);
    } finally {
      setRestoringId(null);
    }
  }

  const {
    rankings,
    customPlayers,
    isSaving,
    isDirty,
    movePlayer,
    addPlayer,
    removePlayer,
    addCustomPlayer,
    removeCustomPlayer,
  } = useBigBoard({
    boardId: board.id,
    initialRankings: board.rankings,
    initialCustomPlayers: board.customPlayers,
  });

  const customPlayerMap = useMemo(() => {
    const map = new Map<string, CustomPlayer>();
    for (const cp of customPlayers) map.set(cp.id, cp);
    return map;
  }, [customPlayers]);

  // Filtered ranked list (for display only — DnD uses full rankings)
  const filteredRankings = useMemo(() => {
    if (!search && !posFilter) return rankings;

    return rankings.filter((id) => {
      const player = players[id];
      const custom = customPlayerMap.get(id);
      const name = player?.name ?? custom?.name ?? '';
      const school = player?.school ?? custom?.school ?? '';
      const position = player?.position ?? custom?.position;

      if (search) {
        const q = search.toLowerCase();
        if (
          !name.toLowerCase().includes(q) &&
          !school.toLowerCase().includes(q)
        )
          return false;
      }

      if (posFilter && position) {
        if (position !== posFilter) return false;
      }

      return true;
    });
  }, [rankings, players, customPlayerMap, search, posFilter]);

  // Unranked pool
  const unrankedPlayers = useMemo(() => {
    const rankedSet = new Set(rankings);
    let result = sortedPlayers.filter((p) => !rankedSet.has(p.id));

    if (poolSearch) {
      const q = poolSearch.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.school.toLowerCase().includes(q),
      );
    }

    if (poolPosFilter) {
      result = result.filter((p) => p.position === poolPosFilter);
    }

    return result;
  }, [sortedPlayers, rankings, poolSearch, poolPosFilter]);

  const isFiltering = Boolean(search || posFilter);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const fromIndex = rankings.indexOf(String(active.id));
    const toIndex = rankings.indexOf(String(over.id));
    if (fromIndex !== -1 && toIndex !== -1) {
      movePlayer(fromIndex, toIndex);
    }
  }

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

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      {/* Ranked list */}
      <div className="space-y-3">
        <BoardToolbar
          search={search}
          onSearchChange={setSearch}
          posFilter={posFilter}
          onPosFilterChange={setPosFilter}
          isSaving={isSaving}
          isDirty={isDirty}
          onAddCustomPlayer={addCustomPlayer}
          onSaveSnapshot={handleSaveSnapshot}
        />

        {snapshots.length > 0 && (
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
              className="text-xs text-muted-foreground"
            >
              {showHistory ? 'Hide' : 'Show'} History ({snapshots.length})
            </Button>

            {showHistory && (
              <div className="mt-1 max-h-48 overflow-y-auto rounded-md border bg-muted/30 p-2">
                {snapshots.map((snap) => (
                  <div
                    key={snap.id}
                    className="flex items-center justify-between gap-2 border-b py-1.5 last:border-0"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="text-sm font-medium">
                        {snap.label || 'Untitled'}
                      </span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {snap.createdAt?.seconds
                          ? new Date(
                              snap.createdAt.seconds * 1000,
                            ).toLocaleDateString()
                          : ''}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => handleRestore(snap)}
                        disabled={restoringId === snap.id}
                      >
                        {restoringId === snap.id ? 'Restoring...' : 'Restore'}
                      </Button>
                      <Button variant="outline" size="xs" asChild>
                        <a
                          href={`/board/compare?boardId=${board.id}&snapshotId=${snap.id}`}
                        >
                          Compare
                        </a>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={isFiltering ? filteredRankings : rankings}
            strategy={verticalListSortingStrategy}
          >
            <div className="max-h-[calc(100vh-16rem)] overflow-y-auto rounded-md border">
              {filteredRankings.length === 0 ? (
                <p className="p-8 text-center text-sm text-muted-foreground">
                  {rankings.length === 0
                    ? 'Your board is empty. Add players from the pool.'
                    : 'No ranked players match your filter.'}
                </p>
              ) : (
                filteredRankings.map((id) => {
                  const player = players[id] ?? null;
                  const custom = customPlayerMap.get(id);
                  const rank = rankings.indexOf(id) + 1;

                  return (
                    <BoardPlayerRow
                      key={id}
                      id={id}
                      rank={rank}
                      player={player}
                      customName={custom?.name}
                      consensusRank={player?.consensusRank}
                      onRemove={() =>
                        custom ? removeCustomPlayer(id) : removePlayer(id)
                      }
                    />
                  );
                })
              )}
            </div>
          </SortableContext>
        </DndContext>

        <p className="text-xs text-muted-foreground">
          {rankings.length} players ranked
        </p>
      </div>

      {/* Unranked pool */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Unranked Players</h3>

        <input
          type="text"
          placeholder="Search unranked..."
          value={poolSearch}
          onChange={(e) => setPoolSearch(e.target.value)}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />

        <div className="flex flex-wrap gap-1.5">
          <Button
            variant={poolPosFilter === null ? 'default' : 'outline'}
            size="xs"
            onClick={() => setPoolPosFilter(null)}
          >
            All
          </Button>
          {POSITIONS.map((pos) => (
            <Button
              key={pos}
              variant={poolPosFilter === pos ? 'default' : 'outline'}
              size="xs"
              onClick={() => setPoolPosFilter(pos)}
            >
              {pos}
            </Button>
          ))}
        </div>

        <div className="max-h-[calc(100vh-20rem)] overflow-y-auto rounded-md border">
          {unrankedPlayers.length === 0 ? (
            <p className="p-4 text-center text-sm text-muted-foreground">
              {poolSearch || poolPosFilter
                ? 'No players match your filter.'
                : 'All players ranked!'}
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="w-12 p-2">#</th>
                  <th className="p-2">Player</th>
                  <th className="w-14 p-2">Pos</th>
                </tr>
              </thead>
              <tbody>
                {unrankedPlayers.map((player) => (
                  <tr
                    key={player.id}
                    onClick={() => addPlayer(player.id)}
                    className="cursor-pointer border-b transition-colors hover:bg-muted/50"
                  >
                    <td className="p-2 font-mono text-muted-foreground">
                      {player.consensusRank >= 9999
                        ? 'NR'
                        : player.consensusRank}
                    </td>
                    <td className="p-2 font-medium">{player.name}</td>
                    <td className="p-2">
                      <Badge
                        style={{
                          backgroundColor: getPositionColor(player.position),
                          color: '#0A0A0B',
                        }}
                        className="text-xs"
                      >
                        {player.position}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          {unrankedPlayers.length} players available
        </p>
      </div>
    </div>
  );
}
