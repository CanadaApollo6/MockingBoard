'use client';

import { useMemo } from 'react';
import type { Player } from '@mockingboard/shared';
import { Badge } from '@/components/ui/badge';
import { getPositionColor } from '@/lib/colors/position-colors';

interface BoardCompareViewProps {
  currentRankings: string[];
  snapshotRankings: string[];
  snapshotLabel?: string;
  snapshotDate: number | null;
  players: Record<string, Player>;
}

interface DiffRow {
  id: string;
  currentRank: number;
  snapshotRank: number | null;
  delta: number | null; // positive = moved up, negative = moved down
}

interface RemovedRow {
  id: string;
  snapshotRank: number;
}

function computeDiff(
  current: string[],
  snapshot: string[],
): { rows: DiffRow[]; removed: RemovedRow[] } {
  const snapshotRank = new Map(snapshot.map((id, i) => [id, i + 1]));
  const currentRank = new Map(current.map((id, i) => [id, i + 1]));

  const rows: DiffRow[] = current.map((id, i) => ({
    id,
    currentRank: i + 1,
    snapshotRank: snapshotRank.get(id) ?? null,
    delta: snapshotRank.has(id) ? snapshotRank.get(id)! - (i + 1) : null,
  }));

  const removed: RemovedRow[] = snapshot
    .filter((id) => !currentRank.has(id))
    .map((id) => ({ id, snapshotRank: snapshotRank.get(id)! }));

  return { rows, removed };
}

function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta === null) {
    return (
      <span className="rounded bg-blue-500/15 px-1.5 py-0.5 text-xs font-medium text-blue-600 dark:text-blue-400">
        NEW
      </span>
    );
  }
  if (delta === 0) {
    return <span className="text-xs text-muted-foreground">&mdash;</span>;
  }
  if (delta > 0) {
    return (
      <span className="text-xs font-medium text-green-600 dark:text-green-400">
        &uarr;{delta}
      </span>
    );
  }
  return (
    <span className="text-xs font-medium text-red-600 dark:text-red-400">
      &darr;{Math.abs(delta)}
    </span>
  );
}

export function BoardCompareView({
  currentRankings,
  snapshotRankings,
  snapshotLabel,
  snapshotDate,
  players,
}: BoardCompareViewProps) {
  const { rows, removed } = useMemo(
    () => computeDiff(currentRankings, snapshotRankings),
    [currentRankings, snapshotRankings],
  );

  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between rounded-md border bg-muted/30 p-3">
        <div className="text-sm">
          <span className="font-medium">
            {snapshotLabel || 'Untitled Snapshot'}
          </span>
          {snapshotDate && (
            <span className="ml-2 text-muted-foreground">
              {new Date(snapshotDate * 1000).toLocaleDateString()}
            </span>
          )}
        </div>
        <div className="text-sm font-medium">Current Board</div>
      </div>

      {/* Comparison table */}
      <div className="overflow-hidden rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-card">
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="w-16 p-2 text-center">Rank</th>
              <th className="p-2">Player</th>
              <th className="w-16 p-2 text-center">Pos</th>
              <th className="w-20 p-2 text-center">Was</th>
              <th className="w-16 p-2 text-center">Change</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const player = players[row.id];
              return (
                <tr key={row.id} className="border-b last:border-0">
                  <td className="p-2 text-center font-mono text-muted-foreground">
                    {row.currentRank}
                  </td>
                  <td className="p-2 font-medium">{player?.name ?? row.id}</td>
                  <td className="p-2 text-center">
                    {player && (
                      <Badge
                        style={{
                          backgroundColor: getPositionColor(player.position),
                          color: '#0A0A0B',
                        }}
                        className="text-xs"
                      >
                        {player.position}
                      </Badge>
                    )}
                  </td>
                  <td className="p-2 text-center font-mono text-muted-foreground">
                    {row.snapshotRank ?? '—'}
                  </td>
                  <td className="p-2 text-center">
                    <DeltaBadge delta={row.delta} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Removed players */}
      {removed.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
            Removed since snapshot ({removed.length})
          </h3>
          <div className="overflow-hidden rounded-md border">
            <table className="w-full text-sm">
              <tbody>
                {removed.map((row) => {
                  const player = players[row.id];
                  return (
                    <tr
                      key={row.id}
                      className="border-b text-muted-foreground last:border-0"
                    >
                      <td className="w-16 p-2 text-center font-mono">
                        #{row.snapshotRank}
                      </td>
                      <td className="p-2">{player?.name ?? row.id}</td>
                      <td className="w-16 p-2 text-center">
                        {player && (
                          <Badge
                            variant="outline"
                            className="text-xs opacity-50"
                          >
                            {player.position}
                          </Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
