'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';

interface ModerationItem {
  id: string;
  contentType: string;
  contentId: string;
  contentPreview: string;
  authorId: string;
  authorName: string;
  status: string;
}

const CONTENT_TYPES = [
  '',
  'scouting-report',
  'video',
  'board',
  'profile',
] as const;
const STATUS_OPTIONS = ['pending', 'approved', 'removed'] as const;

export function ModerationQueue() {
  const [items, setItems] = useState<ModerationItem[]>([]);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [typeFilter, setTypeFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ status: statusFilter });
      if (typeFilter) params.set('type', typeFilter);
      const res = await fetch(`/api/admin/moderation?${params}`);
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setItems(data.items);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleAction = async (id: string, action: 'approve' | 'remove') => {
    setMessage(null);
    try {
      const res = await fetch('/api/admin/moderation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      });
      if (!res.ok) throw new Error('Action failed');
      setItems((prev) => prev.filter((item) => item.id !== id));
      setMessage({
        type: 'success',
        text: `Content ${action === 'approve' ? 'approved' : 'removed'}.`,
      });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Action failed',
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </Select>
        <Select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="">All Types</option>
          {CONTENT_TYPES.filter(Boolean).map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchItems}
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Refresh'}
        </Button>
      </div>

      {message && (
        <div
          className={`rounded-md px-4 py-2 text-sm ${
            message.type === 'success'
              ? 'bg-green-500/10 text-green-500'
              : 'bg-destructive/10 text-destructive'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Queue */}
      {items.length > 0 ? (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {item.contentType}
                    </Badge>
                    <span className="text-sm font-medium">
                      {item.authorName}
                    </span>
                  </div>
                  {statusFilter === 'pending' && (
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        onClick={() => handleAction(item.id, 'approve')}
                        className="text-xs"
                      >
                        Approve
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleAction(item.id, 'remove')}
                        className="text-xs"
                      >
                        Remove
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {item.contentPreview || 'No preview available'}
                </p>
                <p className="mt-1 font-mono text-xs text-muted-foreground">
                  ID: {item.contentId}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {loading ? 'Loading...' : 'No items in the moderation queue.'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
