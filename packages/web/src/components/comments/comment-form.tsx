'use client';

import { useState } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

const MAX_LENGTH = 500;

interface CommentFormProps {
  targetId: string;
  targetType: 'board' | 'report';
  onSubmit: (comment: {
    id: string;
    authorId: string;
    authorName: string;
    authorSlug?: string;
    text: string;
  }) => void;
}

export function CommentForm({
  targetId,
  targetType,
  onSubmit,
}: CommentFormProps) {
  const { user, profile } = useAuth();
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!user) {
    return (
      <p className="text-sm text-muted-foreground">
        <a href="/" className="text-mb-accent hover:underline">
          Sign in
        </a>{' '}
        to comment.
      </p>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || submitting) return;

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetId, targetType, text: trimmed }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to post comment');
      }

      const { comment } = await res.json();
      onSubmit({
        id: comment.id,
        authorId: comment.authorId,
        authorName: comment.authorName,
        authorSlug: comment.authorSlug,
        text: comment.text,
      });
      setText('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={`Comment as ${profile?.displayName ?? 'Anonymous'}...`}
        maxLength={MAX_LENGTH}
        rows={2}
        className="resize-none text-sm"
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {text.length}/{MAX_LENGTH}
        </span>
        <Button type="submit" size="sm" disabled={!text.trim() || submitting}>
          {submitting ? 'Posting...' : 'Post'}
        </Button>
      </div>
      {error && <p className="text-xs text-mb-danger">{error}</p>}
    </form>
  );
}
