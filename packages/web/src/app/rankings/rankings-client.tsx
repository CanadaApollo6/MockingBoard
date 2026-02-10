'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Player, Position, BigBoard } from '@mockingboard/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { GradeBadge } from '@/components/grade-badge';
import { getPositionColor } from '@/lib/position-colors';
import { BoardGeneratorDialog } from '@/components/board-generator-dialog';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

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

const SAVE_DELAY = 2000;

interface RankingsClientProps {
  board: BigBoard;
  players: Record<string, Player>;
}

export function RankingsClient({ board, players }: RankingsClientProps) {
  const [activePos, setActivePos] = useState<Position>('QB');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [generatorOpen, setGeneratorOpen] = useState(false);

  // Per-position rankings state, initialized from board
  const [posRankings, setPosRankings] = useState<
    Partial<Record<Position, string[]>>
  >(() => {
    const initial: Partial<Record<Position, string[]>> = {};
    for (const pos of POSITIONS) {
      // Use saved positional rankings if available, otherwise derive from board
      initial[pos] =
        board.positionRankings?.[pos] ??
        board.rankings.filter((id) => players[id]?.position === pos);
    }
    return initial;
  });

  // Debounced save
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const posRankingsRef = useRef(posRankings);
  posRankingsRef.current = posRankings;

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        await fetch(`/api/boards/${board.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            positionRankings: posRankingsRef.current,
          }),
        });
        setSaveError(null);
      } catch (err) {
        console.error('Failed to save positional rankings:', err);
        setSaveError(err instanceof Error ? err.message : 'Failed to save');
      }
    }, SAVE_DELAY);
  }, [board.id]);

  const currentList = posRankings[activePos] ?? [];

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const list = posRankings[activePos] ?? [];
    const fromIndex = list.indexOf(String(active.id));
    const toIndex = list.indexOf(String(over.id));
    if (fromIndex === -1 || toIndex === -1) return;

    const next = [...list];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);

    setPosRankings((prev) => ({ ...prev, [activePos]: next }));
    scheduleSave();
  }

  function handleGenerate(rankings: string[]) {
    // Filter generated rankings to only the active position
    const posFiltered = rankings.filter(
      (id) => players[id]?.position === activePos,
    );
    setPosRankings((prev) => ({ ...prev, [activePos]: posFiltered }));
    scheduleSave();
  }

  // Count per position for tab badges
  const posCounts = useMemo(() => {
    const counts: Partial<Record<Position, number>> = {};
    for (const pos of POSITIONS) {
      counts[pos] = (posRankings[pos] ?? []).length;
    }
    return counts;
  }, [posRankings]);

  return (
    <div>
      {saveError && (
        <p className="mb-2 text-sm text-destructive">{saveError}</p>
      )}
      <Tabs
        value={activePos}
        onValueChange={(v) => setActivePos(v as Position)}
      >
        <div className="flex items-center gap-3">
          <TabsList className="flex-1 overflow-x-auto">
            {POSITIONS.map((pos) => (
              <TabsTrigger key={pos} value={pos} className="text-xs">
                {pos}
                <span className="ml-1 text-[10px] text-muted-foreground">
                  {posCounts[pos] ?? 0}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setGeneratorOpen(true)}
          >
            <Sparkles className="mr-1 h-3.5 w-3.5" />
            Generate
          </Button>
        </div>

        {POSITIONS.map((pos) => (
          <TabsContent key={pos} value={pos}>
            {pos === activePos && (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={currentList}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="max-h-[calc(100vh-16rem)] overflow-y-auto rounded-md border">
                    {currentList.length === 0 ? (
                      <p className="p-8 text-center text-sm text-muted-foreground">
                        No {pos} players on your board.
                      </p>
                    ) : (
                      currentList.map((id, idx) => {
                        const player = players[id];
                        if (!player) return null;
                        return (
                          <RankingRow
                            key={id}
                            id={id}
                            rank={idx + 1}
                            player={player}
                            grade={board.grades?.[id]}
                            gradeSystem={board.preferredGradeSystem}
                          />
                        );
                      })
                    )}
                  </div>
                </SortableContext>
              </DndContext>
            )}
            <p className="mt-2 text-xs text-muted-foreground">
              {currentList.length} {pos} players ranked
            </p>
          </TabsContent>
        ))}
      </Tabs>

      <BoardGeneratorDialog
        open={generatorOpen}
        onOpenChange={setGeneratorOpen}
        players={players}
        onGenerate={handleGenerate}
      />
    </div>
  );
}

// ---- Sortable row ----

interface RankingRowProps {
  id: string;
  rank: number;
  player: Player;
  grade?: number;
  gradeSystem?: string;
}

function RankingRow({ id, rank, player, grade, gradeSystem }: RankingRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-2 border-b bg-card px-3 py-2 text-sm',
        isDragging && 'z-10 opacity-80 shadow-lg',
      )}
    >
      <button
        type="button"
        className="cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="currentColor"
          aria-hidden="true"
        >
          <circle cx="5" cy="4" r="1.5" />
          <circle cx="11" cy="4" r="1.5" />
          <circle cx="5" cy="8" r="1.5" />
          <circle cx="11" cy="8" r="1.5" />
          <circle cx="5" cy="12" r="1.5" />
          <circle cx="11" cy="12" r="1.5" />
        </svg>
      </button>

      <span className="w-8 text-right font-mono text-muted-foreground">
        {rank}
      </span>

      <span className="flex-1 font-medium">{player.name}</span>

      <Badge
        style={{
          backgroundColor: getPositionColor(player.position),
          color: '#0A0A0B',
        }}
        className="text-xs"
      >
        {player.position}
      </Badge>

      <span className="hidden w-32 truncate text-muted-foreground sm:block">
        {player.school}
      </span>

      {grade != null && (
        <GradeBadge
          grade={grade}
          system={
            (gradeSystem as 'tier' | 'nfl' | 'letter' | 'projection') ?? 'tier'
          }
        />
      )}
    </div>
  );
}
