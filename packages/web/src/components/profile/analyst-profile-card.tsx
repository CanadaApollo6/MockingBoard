import Link from 'next/link';
import type { User } from '@mockingboard/shared';

interface AnalystProfileCardProps {
  user: User;
  followerCount?: number;
  boardCount?: number;
  reportCount?: number;
}

export function AnalystProfileCard({
  user,
  followerCount,
  boardCount,
  reportCount,
}: AnalystProfileCardProps) {
  return (
    <Link
      href={`/profile/${user.slug}`}
      className="block rounded-xl border bg-card p-5 transition-colors hover:bg-muted/30"
    >
      <div className="flex items-start gap-3">
        {user.avatar ? (
          <img
            src={user.avatar}
            alt=""
            className="h-10 w-10 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-bold text-muted-foreground">
            {user.displayName.charAt(0).toUpperCase()}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <h3 className="truncate font-bold">{user.displayName}</h3>
          {user.bio && (
            <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
              {user.bio}
            </p>
          )}
        </div>
      </div>

      <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
        {followerCount != null && (
          <span>
            <span className="font-medium text-foreground">{followerCount}</span>{' '}
            followers
          </span>
        )}
        {boardCount != null && (
          <span>
            <span className="font-medium text-foreground">{boardCount}</span>{' '}
            boards
          </span>
        )}
        {reportCount != null && (
          <span>
            <span className="font-medium text-foreground">{reportCount}</span>{' '}
            reports
          </span>
        )}
      </div>
    </Link>
  );
}
