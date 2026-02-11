'use client';

import { useMemo } from 'react';
import type {
  Draft,
  Pick,
  Player,
  TeamAbbreviation,
} from '@mockingboard/shared';
import { useLiveDraft } from '@/hooks/use-live-draft';
import { BareLayout } from '@/components/layout/bare-layout';
import { getTeamName } from '@/lib/teams';
import { getTeamColor, ensureVisible } from '@/lib/team-colors';
import { getPositionColor } from '@/lib/position-colors';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'next/navigation';

interface TickerOverlayProps {
  draftId: string;
  initialDraft: Draft;
  initialPicks: Pick[];
  players: Record<string, Player>;
}

export function TickerOverlay({
  draftId,
  initialDraft,
  initialPicks,
  players,
}: TickerOverlayProps) {
  const { draft, picks } = useLiveDraft(draftId, initialDraft, initialPicks);
  const searchParams = useSearchParams();
  const count = parseInt(searchParams.get('count') ?? '5', 10);
  const playerMap = useMemo(() => new Map(Object.entries(players)), [players]);

  if (!draft) return null;

  const recentPicks = picks.slice(-count).reverse();

  return (
    <BareLayout className="p-2">
      <div className="space-y-1">
        <AnimatePresence initial={false}>
          {recentPicks.map((pick) => {
            const player = playerMap.get(pick.playerId);
            const colors = getTeamColor(pick.team as TeamAbbreviation);
            return (
              <motion.div
                key={pick.overall}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex items-center gap-3 rounded-md border bg-card px-3 py-2"
                style={{
                  borderLeftColor: ensureVisible(colors.primary),
                  borderLeftWidth: 3,
                }}
              >
                <span className="font-mono text-sm font-bold text-muted-foreground">
                  #{pick.overall}
                </span>
                <span className="text-sm font-medium">
                  {getTeamName(pick.team as TeamAbbreviation)}
                </span>
                <span className="flex-1 text-sm font-bold">
                  {player?.name ?? 'Unknown'}
                </span>
                {player?.position && (
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
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </BareLayout>
  );
}
