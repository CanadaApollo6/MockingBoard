import Link from 'next/link';
import type { Draft } from '@mockingboard/shared';
import { formatDraftDate } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
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
};

const STATUS_LABEL: Record<Draft['status'], string> = {
  lobby: 'Lobby',
  active: 'Live',
  paused: 'Paused',
  complete: 'Complete',
};

export function DraftCard({ draft }: { draft: Draft }) {
  const participantCount = Object.keys(draft.participants).length;
  const totalPicks = draft.pickOrder.length;
  const picksMade = draft.pickedPlayerIds?.length ?? 0;
  const href =
    draft.status === 'active'
      ? `/drafts/${draft.id}/live`
      : `/drafts/${draft.id}`;

  return (
    <Link href={href}>
      <Card className="transition-colors hover:border-primary/30">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              {draft.config.year} Mock Draft
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
              <span>
                Pick {picksMade}/{totalPicks}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
