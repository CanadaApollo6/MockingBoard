import Link from 'next/link';
import { LayoutList, FileText, Heart } from 'lucide-react';
import type { ActivityEvent, ActivityEventType } from '@mockingboard/shared';
import { formatRelativeTime } from '@/lib/format';

const EVENT_CONFIG: Record<
  ActivityEventType,
  { icon: typeof LayoutList; verb: string }
> = {
  'board-published': { icon: LayoutList, verb: 'published a board' },
  'report-created': { icon: FileText, verb: 'wrote a report on' },
  'board-liked': { icon: Heart, verb: 'liked a board' },
  'report-liked': { icon: Heart, verb: 'liked a report on' },
};

interface ActivityEventCardProps {
  event: ActivityEvent;
}

export function ActivityEventCard({ event }: ActivityEventCardProps) {
  const config = EVENT_CONFIG[event.type] ?? EVENT_CONFIG['board-published'];
  const Icon = config.icon;

  return (
    <Link
      href={event.targetLink}
      className="flex items-start gap-3 rounded-lg border bg-card px-4 py-3 transition-colors hover:bg-muted/30"
    >
      <div className="mt-0.5 shrink-0">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm">
          <span className="font-semibold">{event.actorName}</span> {config.verb}{' '}
          <span className="font-semibold">{event.targetName}</span>
        </p>
        <span className="text-[10px] text-muted-foreground/60">
          {formatRelativeTime(
            event.createdAt as { seconds: number } | undefined,
          )}
        </span>
      </div>
    </Link>
  );
}
