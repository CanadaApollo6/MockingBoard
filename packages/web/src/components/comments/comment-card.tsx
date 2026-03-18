'use client';

import { Trash2 } from 'lucide-react';
import type { Comment } from '@mockingboard/shared';
import { formatRelativeTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import { ReportButton } from '@/components/report-button';

interface CommentCardProps {
  comment: Comment;
  canDelete: boolean;
  canReport: boolean;
  onDelete: (commentId: string) => void;
}

export function CommentCard({
  comment,
  canDelete,
  canReport,
  onDelete,
}: CommentCardProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs">
          {comment.authorSlug ? (
            <a
              href={`/profile/${comment.authorSlug}`}
              className="font-medium hover:text-mb-accent hover:underline"
            >
              {comment.authorName}
            </a>
          ) : (
            <span className="font-medium">{comment.authorName}</span>
          )}
          <span className="text-muted-foreground">
            {formatRelativeTime(comment.createdAt)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {canReport && (
            <ReportButton contentType="comment" contentId={comment.id} />
          )}
          {canDelete && (
            <button
              type="button"
              onClick={() => onDelete(comment.id)}
              className={cn(
                'text-muted-foreground transition-colors hover:text-mb-danger',
                'inline-flex items-center p-0.5',
              )}
              aria-label="Delete comment"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
      <p className="text-sm leading-relaxed">{comment.text}</p>
    </div>
  );
}
