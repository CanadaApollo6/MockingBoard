import Link from 'next/link';
import type { Draft, TeamAbbreviation } from '@mockingboard/shared';
import { formatDraftDate } from '@/lib/format';
import { getTeamColor } from '@/lib/team-colors';
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
  const teams = Object.keys(draft.teamAssignments) as TeamAbbreviation[];
  const href =
    draft.status === 'active'
      ? `/drafts/${draft.id}/live`
      : `/drafts/${draft.id}`;

  return (
    <Link href={href}>
      <Card className="transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-mb-border-strong">
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
        </CardContent>
      </Card>
    </Link>
  );
}
