'use client';

import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import type {
  Pick,
  Player,
  TeamAbbreviation,
  DraftSlot,
} from '@mockingboard/shared';
import { getTeamName } from '@/lib/teams';
import { getTeamColor } from '@/lib/team-colors';
import { getPositionColor } from '@/lib/position-colors';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
} from '@/components/ui/table';

type ClockUrgency = 'normal' | 'warning' | 'critical';

interface DraftBoardProps {
  picks: Pick[];
  playerMap: Map<string, Player>;
  pickOrder?: DraftSlot[];
  currentPick?: number;
  groupByRound?: boolean;
  clockUrgency?: ClockUrgency;
}

export function DraftBoard({
  picks,
  playerMap,
  pickOrder,
  currentPick,
  groupByRound = true,
  clockUrgency = 'normal',
}: DraftBoardProps) {
  const shouldReduce = useReducedMotion();
  const hasFullBoard = pickOrder && pickOrder.length > 0;

  if (!hasFullBoard && picks.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground">No picks yet.</p>
    );
  }

  // Build lookup from overall pick number → completed pick
  const pickMap = new Map(picks.map((p) => [p.overall, p]));

  // Group by round: full board uses pickOrder slots, fallback uses completed picks
  const rounds = new Map<number, DraftSlot[] | Pick[]>();
  if (hasFullBoard) {
    for (const slot of pickOrder) {
      const items = (rounds.get(slot.round) as DraftSlot[] | undefined) ?? [];
      items.push(slot);
      rounds.set(slot.round, items);
    }
  } else {
    for (const pick of picks) {
      const items = (rounds.get(pick.round) as Pick[] | undefined) ?? [];
      items.push(pick);
      rounds.set(pick.round, items);
    }
  }

  return (
    <div className="space-y-6">
      {Array.from(rounds.entries()).map(([round, roundItems]) => (
        <div key={round}>
          {groupByRound && rounds.size > 1 && (
            <h3 className="mb-2 text-sm font-medium text-muted-foreground">
              Round {round}
            </h3>
          )}
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <tr className="border-b">
                  <TableHead className="w-14">#</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>Player</TableHead>
                  <TableHead className="w-16">Pos</TableHead>
                  <TableHead className="hidden sm:table-cell">School</TableHead>
                  <TableHead className="w-16 text-right">Rank</TableHead>
                </tr>
              </TableHeader>
              <TableBody>
                <AnimatePresence initial={false}>
                  {hasFullBoard
                    ? (roundItems as DraftSlot[]).map((slot) => {
                        const pick = pickMap.get(slot.overall);
                        if (pick) {
                          return (
                            <PickRow
                              key={slot.overall}
                              pick={pick}
                              player={playerMap.get(pick.playerId)}
                              shouldReduce={shouldReduce ?? false}
                            />
                          );
                        }
                        if (slot.overall === currentPick) {
                          return (
                            <OnTheClockRow
                              key={slot.overall}
                              slot={slot}
                              urgency={clockUrgency}
                            />
                          );
                        }
                        return <EmptyRow key={slot.overall} slot={slot} />;
                      })
                    : (roundItems as Pick[]).map((pick) => (
                        <PickRow
                          key={pick.overall}
                          pick={pick}
                          player={playerMap.get(pick.playerId)}
                          shouldReduce={shouldReduce ?? false}
                        />
                      ))}
                </AnimatePresence>
              </TableBody>
            </Table>
          </div>
        </div>
      ))}
    </div>
  );
}

function PickRow({
  pick,
  player,
  shouldReduce,
}: {
  pick: Pick;
  player: Player | undefined;
  shouldReduce: boolean;
}) {
  const isCpu = pick.userId === null;
  const teamColor = getTeamColor(pick.team as TeamAbbreviation).primary;
  const posColor = player?.position
    ? getPositionColor(player.position)
    : undefined;

  return (
    <motion.tr
      initial={shouldReduce ? false : { opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      style={{ borderLeft: `3px solid ${teamColor}` }}
      className="border-b transition-colors hover:bg-muted/50"
    >
      <TableCell className="font-mono text-muted-foreground">
        {pick.overall}
      </TableCell>
      <TableCell className="font-medium">
        {getTeamName(pick.team as TeamAbbreviation)}
      </TableCell>
      <TableCell>
        <span className="font-medium">{player?.name ?? 'Unknown Player'}</span>
        {isCpu && (
          <Badge variant="outline" className="ml-2 text-xs">
            CPU
          </Badge>
        )}
      </TableCell>
      <TableCell>
        {posColor ? (
          <Badge
            style={{ backgroundColor: posColor, color: '#0A0A0B' }}
            className="text-xs"
          >
            {player?.position}
          </Badge>
        ) : (
          <Badge variant="secondary">&mdash;</Badge>
        )}
      </TableCell>
      <TableCell className="hidden text-muted-foreground sm:table-cell">
        {player?.school ?? '—'}
      </TableCell>
      <TableCell className="text-right font-mono text-muted-foreground">
        {player?.consensusRank ?? '—'}
      </TableCell>
    </motion.tr>
  );
}

function OnTheClockRow({
  slot,
  urgency = 'normal',
}: {
  slot: DraftSlot;
  urgency?: ClockUrgency;
}) {
  const teamColor = getTeamColor(slot.team as TeamAbbreviation).primary;
  // Hex values for framer-motion interpolation (CSS vars can't be animated)
  const pulseHex =
    urgency === 'critical'
      ? '#ff4d6a'
      : urgency === 'warning'
        ? '#ffb84d'
        : teamColor;
  const pulseDuration =
    urgency === 'critical' ? 0.75 : urgency === 'warning' ? 1.5 : 3;

  return (
    <motion.tr
      key={`otc-${urgency}`}
      initial={{ opacity: 0 }}
      animate={{
        opacity: 1,
        backgroundColor: [`${pulseHex}0A`, `${pulseHex}1A`, `${pulseHex}0A`],
      }}
      transition={{
        opacity: { duration: 0.3 },
        backgroundColor: {
          duration: pulseDuration,
          repeat: Infinity,
          ease: 'easeInOut',
        },
      }}
      style={{ borderLeft: `3px solid ${pulseHex}` }}
      className="border-b"
    >
      <TableCell className="font-mono text-mb-accent">{slot.overall}</TableCell>
      <TableCell className="font-medium">
        {getTeamName(slot.team as TeamAbbreviation)}
      </TableCell>
      <TableCell colSpan={4} className="font-medium text-mb-accent">
        On the Clock
      </TableCell>
    </motion.tr>
  );
}

function EmptyRow({ slot }: { slot: DraftSlot }) {
  const teamColor = getTeamColor(slot.team as TeamAbbreviation).primary;

  return (
    <tr
      style={{ borderLeft: `3px solid ${teamColor}` }}
      className="border-b opacity-40"
    >
      <TableCell className="font-mono text-mb-text-tertiary">
        {slot.overall}
      </TableCell>
      <TableCell className="text-mb-text-tertiary">
        {getTeamName(slot.team as TeamAbbreviation)}
      </TableCell>
      <TableCell colSpan={4} className="text-mb-text-tertiary">
        —
      </TableCell>
    </tr>
  );
}
