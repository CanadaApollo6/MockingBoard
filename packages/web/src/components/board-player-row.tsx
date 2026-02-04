'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Player } from '@mockingboard/shared';
import { Badge } from '@/components/ui/badge';
import { getPositionColor } from '@/lib/position-colors';
import { cn } from '@/lib/utils';

interface BoardPlayerRowProps {
  id: string;
  rank: number;
  player: Player | null;
  customName?: string;
  consensusRank?: number;
  onRemove: () => void;
}

export function BoardPlayerRow({
  id,
  rank,
  player,
  customName,
  consensusRank,
  onRemove,
}: BoardPlayerRowProps) {
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

  const name = player?.name ?? customName ?? 'Unknown';
  const position = player?.position;
  const school = player?.school;

  // Delta between board rank and consensus rank
  const delta =
    consensusRank != null && consensusRank < 9999 ? consensusRank - rank : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-2 border-b bg-card px-3 py-2 text-sm',
        isDragging && 'z-10 opacity-80 shadow-lg',
      )}
    >
      {/* Drag handle */}
      <button
        type="button"
        className="cursor-grab active:cursor-grabbing touch-none text-muted-foreground hover:text-foreground"
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

      {/* Rank */}
      <span className="w-8 text-right font-mono text-muted-foreground">
        {rank}
      </span>

      {/* Player info */}
      <span className="flex-1 font-medium">{name}</span>

      {/* Position */}
      {position && (
        <Badge
          style={{
            backgroundColor: getPositionColor(position),
            color: '#0A0A0B',
          }}
          className="text-xs"
        >
          {position}
        </Badge>
      )}

      {/* School */}
      {school && (
        <span className="hidden w-32 truncate text-muted-foreground sm:block">
          {school}
        </span>
      )}

      {/* Consensus delta */}
      {delta != null && (
        <span
          className={cn(
            'w-10 text-right font-mono text-xs',
            delta > 0 && 'text-mb-success',
            delta < 0 && 'text-mb-danger',
            delta === 0 && 'text-muted-foreground',
          )}
        >
          {delta > 0 ? `+${delta}` : delta === 0 ? '—' : String(delta)}
        </span>
      )}

      {/* Remove button */}
      <button
        type="button"
        onClick={onRemove}
        className="text-muted-foreground hover:text-destructive"
        aria-label="Remove from board"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M3 3l8 8M11 3l-8 8" />
        </svg>
      </button>
    </div>
  );
}
