'use client';

import { useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';

interface VideoSubmitFormProps {
  playerId: string;
  onSubmitted: () => void;
  onCancel: () => void;
}

export function VideoSubmitForm({
  playerId,
  onSubmitted,
  onCancel,
}: VideoSubmitFormProps) {
  const { user } = useAuth();
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [timestamp, setTimestamp] = useState('');
  const [tags, setTags] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!user) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!url.trim() || !title.trim()) {
      setError('URL and title are required.');
      return;
    }

    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        playerId,
        url: url.trim(),
        title: title.trim(),
      };

      const ts = parseInt(timestamp, 10);
      if (!isNaN(ts) && ts > 0) body.timestamp = ts;

      const tagList = tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      if (tagList.length > 0) body.tags = tagList;

      const res = await fetch('/api/videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Failed to submit video.');
        return;
      }

      onSubmitted();
    } catch {
      setError('Failed to submit video.');
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    'w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring';

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="mb-1 block text-xs font-medium">Video URL *</label>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="YouTube, Instagram, Twitter/X, or TikTok URL"
          className={inputClass}
          required
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium">Title *</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Film breakdown title"
          className={inputClass}
          maxLength={120}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium">
            Start time (seconds)
          </label>
          <input
            type="number"
            value={timestamp}
            onChange={(e) => setTimestamp(e.target.value)}
            placeholder="0"
            min={0}
            className={inputClass}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium">
            Tags (comma-separated)
          </label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="film, breakdown"
            className={inputClass}
          />
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={submitting}>
          {submitting ? 'Submitting...' : 'Submit Video'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCancel}
          disabled={submitting}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
