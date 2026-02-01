'use client';

import type { CpuTradeEvaluation } from '@mockingboard/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface TradeResultProps {
  evaluation: CpuTradeEvaluation;
  onConfirm: () => void;
  onForce: () => void;
  onCancel: () => void;
  disabled: boolean;
}

export function TradeResult({
  evaluation,
  onConfirm,
  onForce,
  onCancel,
  disabled,
}: TradeResultProps) {
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
                  ? 'text-green-600 dark:text-green-400'
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
