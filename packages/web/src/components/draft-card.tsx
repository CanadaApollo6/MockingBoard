'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Draft, TeamAbbreviation } from '@mockingboard/shared';
import { formatDraftDate, getDraftDisplayName } from '@/lib/format';
import { getTeamColor } from '@/lib/team-colors';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';

const STATUS_VARIANT: Record<
  Draft['status'],
  'default' | 'secondary' | 'outline' | 'destructive'
> = {
  lobby: 'outline',
  active: 'default',
  paused: 'secondary',
  complete: 'secondary',
  cancelled: 'destructive',
};

const STATUS_LABEL: Record<Draft['status'], string> = {
  lobby: 'Lobby',
  active: 'Live',
  paused: 'Paused',
  complete: 'Complete',
  cancelled: 'Cancelled',
};

interface DraftCardProps {
  draft: Draft;
  userId?: string;
  onRemove?: () => void;
}

export function DraftCard({ draft, userId, onRemove }: DraftCardProps) {
  const participantCount = Object.keys(draft.participants).length;
  const totalPicks = draft.pickOrder.length;
  const picksMade = draft.pickedPlayerIds?.length ?? 0;
  const teams = Object.keys(draft.teamAssignments) as TeamAbbreviation[];
  const href =
    draft.status === 'active'
      ? `/drafts/${draft.id}/live`
      : `/drafts/${draft.id}`;

  const isCreator = userId === draft.createdBy;
  const canCancel =
    isCreator &&
    (draft.status === 'lobby' ||
      draft.status === 'active' ||
      draft.status === 'paused');
  const canDelete =
    isCreator && (draft.status === 'complete' || draft.status === 'cancelled');

  const [confirming, setConfirming] = useState<'cancel' | 'delete' | null>(
    null,
  );
  const [loading, setLoading] = useState(false);

  async function handleAction(e: React.MouseEvent) {
    e.preventDefault();
    const endpoint =
      confirming === 'cancel'
        ? `/api/drafts/${draft.id}/cancel`
        : `/api/drafts/${draft.id}/delete`;

    setLoading(true);
    try {
      const res = await fetch(endpoint, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Action failed');
      }
      onRemove?.();
    } catch {
      setLoading(false);
      setConfirming(null);
    }
  }

  return (
    <Link href={href}>
      <Card className="transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-mb-border-strong">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              {getDraftDisplayName(draft)}
            </CardTitle>
            <Badge variant={STATUS_VARIANT[draft.status]}>
              {STATUS_LABEL[draft.status]}
            </Badge>
          </div>
          <CardDescription>{formatDraftDate(draft.createdAt)}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <span>
              {participantCount} drafter{participantCount !== 1 ? 's' : ''}
            </span>
            <span>
              {draft.config.rounds} round{draft.config.rounds !== 1 ? 's' : ''}
            </span>
            {draft.status === 'complete' && <span>{picksMade} picks</span>}
            {draft.status === 'active' && totalPicks > 0 && (
              <div className="flex items-center gap-2">
                <span>
                  Pick {picksMade}/{totalPicks}
                </span>
                <div className="h-1.5 w-16 overflow-hidden rounded-full bg-mb-border">
                  <div
                    className="h-full rounded-full bg-mb-accent transition-all"
                    style={{ width: `${(picksMade / totalPicks) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {teams.map((team) => (
              <div
                key={team}
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: getTeamColor(team).primary }}
                title={team}
              />
            ))}
          </div>
          {(canCancel || canDelete) && (
            <div className="mt-3 border-t border-mb-border pt-3">
              {confirming ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {confirming === 'cancel'
                      ? 'Cancel this draft?'
                      : 'Delete permanently?'}
                  </span>
                  <Button
                    variant="destructive"
                    size="xs"
                    onClick={handleAction}
                    disabled={loading}
                  >
                    {loading ? '...' : 'Yes'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={(e) => {
                      e.preventDefault();
                      setConfirming(null);
                    }}
                  >
                    No
                  </Button>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="xs"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={(e) => {
                    e.preventDefault();
                    setConfirming(canCancel ? 'cancel' : 'delete');
                  }}
                >
                  {canCancel ? 'Cancel Draft' : 'Delete Draft'}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
