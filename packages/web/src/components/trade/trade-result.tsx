'use client';

import { useEffect, useState } from 'react';
import type { CpuTradeEvaluation, Trade } from '@mockingboard/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { extractTimestampMs } from '@/lib/firebase/format';

interface CpuTradeResultProps {
  evaluation: CpuTradeEvaluation;
  trade?: never;
  recipientName?: never;
  onConfirm: () => void;
  onForce: () => void;
  onCancel: () => void;
  disabled: boolean;
}

interface UserTradeResultProps {
  evaluation?: never;
  trade: Trade;
  recipientName: string;
  onConfirm?: never;
  onForce?: never;
  onCancel: () => void;
  disabled: boolean;
}

type TradeResultProps = CpuTradeResultProps | UserTradeResultProps;

function TradeCountdown({ expiresAt }: { expiresAt: Trade['expiresAt'] }) {
  const [remaining, setRemaining] = useState(() => {
    if (!expiresAt) return 0;
    const ms = extractTimestampMs(expiresAt);
    return Math.max(0, Math.ceil((ms - Date.now()) / 1000));
  });

  useEffect(() => {
    if (remaining <= 0) return;
    const id = setInterval(() => {
      setRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [remaining > 0]);

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;

  return (
    <span
      className={cn(
        'font-mono text-sm',
        remaining <= 30 ? 'text-destructive' : 'text-muted-foreground',
      )}
    >
      {mins}:{secs.toString().padStart(2, '0')}
    </span>
  );
}

export function TradeResult(props: TradeResultProps) {
  // User-to-user trade: show "waiting for response" state
  if (props.trade) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <CardTitle>Trade Proposed</CardTitle>
            <Badge variant="secondary">Pending</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Waiting for {props.recipientName} to respond...
            </p>
            {props.trade.expiresAt && (
              <TradeCountdown expiresAt={props.trade.expiresAt} />
            )}
          </div>
          <Button
            variant="outline"
            onClick={props.onCancel}
            disabled={props.disabled}
          >
            {props.disabled ? 'Cancelling...' : 'Cancel Trade'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // CPU trade: show evaluation result
  const { evaluation, onConfirm, onForce, onCancel, disabled } = props;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <CardTitle>Trade Result</CardTitle>
          <Badge variant={evaluation.accept ? 'default' : 'destructive'}>
            {evaluation.accept ? 'Accepted' : 'Rejected'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{evaluation.reason}</p>

        <div className="grid grid-cols-3 gap-2 text-center text-sm">
          <div className="rounded-md border p-2">
            <p className="text-xs text-muted-foreground">CPU Gives</p>
            <p className="font-medium">
              {evaluation.cpuGivingValue.toFixed(1)}
            </p>
          </div>
          <div className="rounded-md border p-2">
            <p className="text-xs text-muted-foreground">CPU Gets</p>
            <p className="font-medium">
              {evaluation.cpuReceivingValue.toFixed(1)}
            </p>
          </div>
          <div className="rounded-md border p-2">
            <p className="text-xs text-muted-foreground">Net</p>
            <p
              className={cn(
                'font-medium',
                evaluation.netValue >= 0
                  ? 'text-mb-success'
                  : 'text-destructive',
              )}
            >
              {evaluation.netValue >= 0 ? '+' : ''}
              {evaluation.netValue.toFixed(1)}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel} disabled={disabled}>
            Cancel
          </Button>
          {evaluation.accept ? (
            <Button onClick={onConfirm} disabled={disabled}>
              {disabled ? 'Confirming...' : 'Confirm Trade'}
            </Button>
          ) : (
            <Button variant="destructive" onClick={onForce} disabled={disabled}>
              {disabled ? 'Forcing...' : 'Force Trade'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
