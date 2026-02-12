'use client';

import type { Player } from '@mockingboard/shared';
import { Badge } from '@/components/ui/badge';
import { getPositionColor } from '@/lib/colors/position-colors';
import { BareLayout } from '@/components/layout/bare-layout';

interface EmbeddableBoardViewProps {
  boardName: string;
  authorName?: string;
  players: Player[];
  maxHeight?: number;
}

export function EmbeddableBoardView({
  boardName,
  authorName,
  players,
  maxHeight,
}: EmbeddableBoardViewProps) {
  return (
    <BareLayout>
      <div className="overflow-hidden rounded-lg border bg-card">
        {/* Header */}
        <div className="border-b px-3 py-2">
          <div className="text-sm font-bold">{boardName}</div>
          {authorName && (
            <div className="text-xs text-muted-foreground">by {authorName}</div>
          )}
        </div>

        {/* Table */}
        <div
          className="overflow-auto"
          style={maxHeight ? { maxHeight } : undefined}
        >
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
                <th className="w-10 px-2 py-1.5 font-medium">#</th>
                <th className="px-2 py-1.5 font-medium">Player</th>
                <th className="px-2 py-1.5 font-medium">School</th>
                <th className="w-14 px-2 py-1.5 font-medium">Pos</th>
              </tr>
            </thead>
            <tbody>
              {players.map((player, i) => (
                <tr key={player.id} className="border-b last:border-0">
                  <td className="px-2 py-1.5 font-mono text-muted-foreground">
                    {i + 1}
                  </td>
                  <td className="px-2 py-1.5 font-bold">{player.name}</td>
                  <td className="px-2 py-1.5 text-muted-foreground">
                    {player.school}
                  </td>
                  <td className="px-2 py-1.5">
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
        </div>

        {/* Footer */}
        <div className="border-t px-3 py-1.5 text-right text-xs text-muted-foreground">
          MockingBoard
        </div>
      </div>
    </BareLayout>
  );
}
