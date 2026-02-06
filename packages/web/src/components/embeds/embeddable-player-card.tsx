'use client';

import type { Player } from '@mockingboard/shared';
import { Badge } from '@/components/ui/badge';
import { getPositionColor } from '@/lib/position-colors';
import { schoolColorStyle } from '@/lib/school-colors';
import { UNRANKED } from '@/lib/player-utils';
import { BareLayout } from '@/components/bare-layout';

interface EmbeddablePlayerCardProps {
  player: Player;
}

export function EmbeddablePlayerCard({ player }: EmbeddablePlayerCardProps) {
  const subtitle = [player.school, player.attributes?.conference]
    .filter(Boolean)
    .join(' \u00B7 ');

  return (
    <BareLayout>
      <div
        className="overflow-hidden rounded-xl border border-mb-border-strong bg-card"
        style={schoolColorStyle(player.school)}
      >
        <div
          className="h-[2px]"
          style={{
            background:
              'linear-gradient(to right, var(--school-primary), var(--school-secondary))',
          }}
        />
        <div className="p-5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-3xl font-bold text-muted-foreground">
              {player.consensusRank >= UNRANKED
                ? 'NR'
                : `#${player.consensusRank}`}
            </span>
            <Badge
              style={{
                backgroundColor: getPositionColor(player.position),
                color: '#0A0A0B',
              }}
            >
              {player.position}
            </Badge>
          </div>
          <h2 className="mt-2 font-[family-name:var(--font-display)] text-2xl font-bold uppercase tracking-tight">
            {player.name}
          </h2>
          {subtitle && (
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <div className="border-t px-5 py-2 text-right text-xs text-muted-foreground">
          MockingBoard
        </div>
      </div>
    </BareLayout>
  );
}
