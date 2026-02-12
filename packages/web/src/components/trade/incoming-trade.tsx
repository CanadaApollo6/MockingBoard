'use client';

import { useEffect, useState } from 'react';
import type { Draft, Trade } from '@mockingboard/shared';
import { getPickValue, getFuturePickValue } from '@mockingboard/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getTeamName } from '@/lib/teams';
import { extractTimestampMs } from '@/lib/firebase/format';

interface IncomingTradeProps {
  trade: Trade;
  draft: Draft;
  onAccept: () => void;
  onReject: () => void;
  disabled: boolean;
}

export function IncomingTrade({
  trade,
  draft,
  onAccept,
  onReject,
  disabled,
}: IncomingTradeProps) {
  const proposerName = draft.participantNames?.[trade.proposerId] ?? 'Unknown';

  const [remaining, setRemaining] = useState(() => {
    if (!trade.expiresAt) return Infinity;
    const ms = extractTimestampMs(trade.expiresAt);
    return Math.max(0, Math.ceil((ms - Date.now()) / 1000));
  });

  useEffect(() => {
    if (remaining <= 0 || remaining === Infinity) return;
    const id = setInterval(() => {
      setRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [remaining > 0]);

  const isExpired = remaining === 0;
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;

  return (
    <Card className="border-mb-accent/30 bg-mb-accent/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            {proposerName} wants to trade
          </CardTitle>
          {remaining !== Infinity && (
            <Badge
              variant={isExpired ? 'destructive' : 'secondary'}
              className="font-mono"
            >
              {isExpired
                ? 'Expired'
                : `${mins}:${secs.toString().padStart(2, '0')}`}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-md border p-2">
            <p className="mb-1 text-xs font-medium text-muted-foreground">
              You give ({getTeamName(trade.recipientTeam)})
            </p>
            <div className="space-y-0.5">
              {trade.proposerReceives.map((piece, i) => (
                <PickLine key={i} piece={piece} draftYear={draft.config.year} />
              ))}
            </div>
          </div>
          <div className="rounded-md border p-2">
            <p className="mb-1 text-xs font-medium text-muted-foreground">
              You get ({getTeamName(trade.proposerTeam)})
            </p>
            <div className="space-y-0.5">
              {trade.proposerGives.map((piece, i) => (
                <PickLine key={i} piece={piece} draftYear={draft.config.year} />
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onReject}
            disabled={disabled || isExpired}
          >
            Reject
          </Button>
          <Button size="sm" onClick={onAccept} disabled={disabled || isExpired}>
            {disabled ? 'Processing...' : 'Accept Trade'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function PickLine({
  piece,
  draftYear,
}: {
  piece: Trade['proposerGives'][number];
  draftYear: number;
}) {
  if (piece.type === 'current-pick' && piece.overall) {
    const slot = piece.overall;
    const round = Math.ceil(slot / 32);
    const pick = ((slot - 1) % 32) + 1;
    return (
      <p className="text-xs">
        R{round} P{pick} #{slot}
        <span className="ml-1 text-muted-foreground">
          ({getPickValue(slot).toFixed(1)})
        </span>
      </p>
    );
  }

  if (piece.type === 'future-pick' && piece.year && piece.round) {
    const value = getFuturePickValue(piece.round, piece.year - draftYear);
    return (
      <p className="text-xs">
        {piece.year} R{piece.round}
        {piece.originalTeam && ` — ${piece.originalTeam}`}
        <span className="ml-1 text-muted-foreground">({value.toFixed(1)})</span>
      </p>
    );
  }

  return null;
}
