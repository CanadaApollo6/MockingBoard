'use client';

import { useRouter } from 'next/navigation';
import type { AppNotification, NotificationType } from '@mockingboard/shared';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import {
  UserPlus,
  Clock,
  ArrowLeftRight,
  LayoutList,
  CheckCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const TYPE_ICONS: Record<NotificationType, typeof UserPlus> = {
  'new-follower': UserPlus,
  'your-turn': Clock,
  'trade-accepted': ArrowLeftRight,
  'new-board': LayoutList,
};

function formatRelativeTime(ts: { seconds: number } | undefined): string {
  if (!ts) return '';
  const diff = Math.floor(Date.now() / 1000 - ts.seconds);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

interface NotificationDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notifications: AppNotification[];
  onMarkRead: (ids: string[]) => Promise<void>;
  onMarkAllRead: () => Promise<void>;
}

export function NotificationDrawer({
  open,
  onOpenChange,
  notifications,
  onMarkRead,
  onMarkAllRead,
}: NotificationDrawerProps) {
  const router = useRouter();
  const hasUnread = notifications.some((n) => !n.read);

  const handleClick = async (notification: AppNotification) => {
    if (!notification.read) {
      await onMarkRead([notification.id]);
    }
    if (notification.link) {
      router.push(notification.link);
      onOpenChange(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-sm">
        <SheetHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <SheetTitle>Notifications</SheetTitle>
            <SheetDescription className="sr-only">
              Your recent notifications
            </SheetDescription>
          </div>
          {hasUnread && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={onMarkAllRead}
            >
              <CheckCheck className="mr-1 h-3.5 w-3.5" />
              Mark all read
            </Button>
          )}
        </SheetHeader>

        <div className="space-y-1">
          {notifications.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No notifications yet.
            </p>
          ) : (
            notifications.map((notification) => {
              const Icon = TYPE_ICONS[notification.type] ?? LayoutList;
              return (
                <button
                  key={notification.id}
                  onClick={() => handleClick(notification)}
                  className={cn(
                    'flex w-full items-start gap-3 rounded-md px-3 py-2.5 text-left transition-colors hover:bg-muted/50',
                    !notification.read && 'bg-muted/30',
                  )}
                >
                  <div className="mt-0.5 shrink-0">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'text-sm',
                          !notification.read && 'font-semibold',
                        )}
                      >
                        {notification.title}
                      </span>
                      {!notification.read && (
                        <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                      {notification.body}
                    </p>
                    <span className="mt-1 text-[10px] text-muted-foreground/60">
                      {formatRelativeTime(
                        notification.createdAt as
                          | { seconds: number }
                          | undefined,
                      )}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
