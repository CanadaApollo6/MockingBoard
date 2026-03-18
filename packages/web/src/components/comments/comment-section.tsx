'use client';

import { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import type { Comment } from '@mockingboard/shared';
import { useAuth } from '@/components/auth/auth-provider';
import { CommentCard } from './comment-card';
import { CommentForm } from './comment-form';

interface CommentSectionProps {
  targetId: string;
  targetType: 'board' | 'report' | 'list';
  initialComments?: Comment[];
  initialCount?: number;
}

export function CommentSection({
  targetId,
  targetType,
  initialComments,
  initialCount = 0,
}: CommentSectionProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>(initialComments ?? []);
  const [count, setCount] = useState(initialCount);
  const [loaded, setLoaded] = useState(!!initialComments);
  const [loading, setLoading] = useState(false);

  async function loadComments() {
    if (loaded) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/comments?targetId=${targetId}&targetType=${targetType}`,
      );
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  }

  function handleNewComment(comment: {
    id: string;
    authorId: string;
    authorName: string;
    authorSlug?: string;
    text: string;
  }) {
    const newComment: Comment = {
      ...comment,
      targetId,
      targetType,
      createdAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 },
    };
    setComments((prev) => [newComment, ...prev]);
    setCount((c) => c + 1);
  }

  async function handleDelete(commentId: string) {
    // Optimistic remove
    const prev = comments;
    setComments((c) => c.filter((cm) => cm.id !== commentId));
    setCount((c) => c - 1);

    try {
      const res = await fetch(`/api/comments/${commentId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        setComments(prev);
        setCount((c) => c + 1);
      }
    } catch {
      setComments(prev);
      setCount((c) => c + 1);
    }
  }

  return (
    <section className="space-y-4">
      <button
        type="button"
        onClick={loadComments}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <MessageSquare className="h-4 w-4" />
        Comments{count > 0 && ` (${count})`}
      </button>

      {loading && (
        <p className="text-xs text-muted-foreground">Loading comments...</p>
      )}

      {loaded && (
        <div className="space-y-4">
          <CommentForm
            targetId={targetId}
            targetType={targetType}
            onSubmit={handleNewComment}
          />

          {comments.length > 0 ? (
            <div className="space-y-3 border-t pt-3">
              {comments.map((comment) => (
                <CommentCard
                  key={comment.id}
                  comment={comment}
                  canDelete={user?.uid === comment.authorId}
                  canReport={!!user && user.uid !== comment.authorId}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              No comments yet. Be the first to share your thoughts.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
