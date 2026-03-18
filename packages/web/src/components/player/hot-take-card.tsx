import Link from 'next/link';
import { Flame, ArrowUp, ArrowDown } from 'lucide-react';
import type { Player } from '@mockingboard/shared';
import { Routes } from '@/routes';
import { getPositionColor } from '@/lib/colors/position-colors';

interface HotTakeCardProps {
  player: Player;
  boardRank: number;
  consensusRank: number;
  delta: number;
  boardId?: string;
  authorName?: string;
}

export function HotTakeCard({
  player,
  boardRank,
  consensusRank,
  delta,
  boardId,
  authorName,
}: HotTakeCardProps) {
  const absDelta = Math.abs(Math.round(delta));
  const isHigher = delta > 0;

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3">
      <Flame className="h-4 w-4 shrink-0 text-orange-500" />

      {/* Position badge */}
      <span
        className="inline-flex w-12 justify-center rounded px-1.5 py-0.5 text-xs font-bold text-white"
        style={{ backgroundColor: getPositionColor(player.position) }}
      >
        {player.position}
      </span>

      {/* Player info */}
      <div className="min-w-0 flex-1">
        <Link
          href={Routes.prospect(player.id)}
          className="font-medium hover:underline"
        >
          {player.name}
        </Link>
        <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
          <span>
            Ranked #{boardRank}
            {authorName && boardId && (
              <>
                {' '}
                by{' '}
                <Link
                  href={Routes.board(boardId)}
                  className="text-mb-accent hover:underline"
                >
                  {authorName}
                </Link>
              </>
            )}
          </span>
          <span>vs Consensus #{consensusRank}</span>
        </div>
      </div>

      {/* Delta badge */}
      <span
        className={`flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-bold ${
          isHigher
            ? 'bg-emerald-500/10 text-emerald-500'
            : 'bg-red-500/10 text-red-500'
        }`}
      >
        {isHigher ? (
          <ArrowUp className="h-3 w-3" />
        ) : (
          <ArrowDown className="h-3 w-3" />
        )}
        {absDelta}
      </span>
    </div>
  );
}
