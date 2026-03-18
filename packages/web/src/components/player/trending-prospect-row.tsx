import Link from 'next/link';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import type { Player } from '@mockingboard/shared';
import { Routes } from '@/routes';
import { getPositionColor } from '@/lib/colors/position-colors';

interface TrendingProspectRowProps {
  player: Player;
  boardCount: number;
  averageRank: number;
  delta: number;
  rank: number;
}

export function TrendingProspectRow({
  player,
  boardCount,
  averageRank,
  delta,
  rank,
}: TrendingProspectRowProps) {
  const absDelta = Math.abs(Math.round(delta));

  return (
    <Link
      href={Routes.prospect(player.id)}
      className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 transition-colors hover:bg-muted/30"
    >
      <span className="w-6 text-center font-mono text-sm font-bold text-muted-foreground">
        {rank}
      </span>

      {/* Delta indicator */}
      <div className="flex w-14 items-center justify-center gap-0.5">
        {delta > 0 ? (
          <span className="flex items-center gap-0.5 text-sm font-bold text-emerald-500">
            <ArrowUp className="h-3.5 w-3.5" />
            {absDelta}
          </span>
        ) : delta < 0 ? (
          <span className="flex items-center gap-0.5 text-sm font-bold text-red-500">
            <ArrowDown className="h-3.5 w-3.5" />
            {absDelta}
          </span>
        ) : (
          <Minus className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </div>

      {/* Position badge */}
      <span
        className="inline-flex w-12 justify-center rounded px-1.5 py-0.5 text-xs font-bold text-white"
        style={{ backgroundColor: getPositionColor(player.position) }}
      >
        {player.position}
      </span>

      {/* Name + school */}
      <div className="min-w-0 flex-1">
        <span className="font-medium">{player.name}</span>
        <span className="ml-2 text-sm text-muted-foreground">
          {player.school}
        </span>
      </div>

      {/* Stats */}
      <div className="hidden items-center gap-4 text-xs text-muted-foreground sm:flex">
        <span title="Community average rank">
          Avg #{Math.round(averageRank)}
        </span>
        <span title="Number of boards featuring this player">
          {boardCount} boards
        </span>
      </div>
    </Link>
  );
}
