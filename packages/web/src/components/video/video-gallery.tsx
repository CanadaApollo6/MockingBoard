'use client';

import { useState } from 'react';
import type { VideoBreakdown } from '@mockingboard/shared';
import { useAuth } from '@/components/auth/auth-provider';
import { Button } from '@/components/ui/button';
import { VideoEmbed } from '@/components/video/video-embed';
import { VideoSubmitForm } from '@/components/video/video-submit-form';

interface VideoGalleryProps {
  playerId: string;
  playerName: string;
  initialVideos: VideoBreakdown[];
}

export function VideoGallery({
  playerId,
  playerName,
  initialVideos,
}: VideoGalleryProps) {
  const { user } = useAuth();
  const [videos, setVideos] = useState(initialVideos);
  const [showForm, setShowForm] = useState(false);

  async function refresh() {
    try {
      const res = await fetch(`/api/videos?playerId=${playerId}`);
      if (res.ok) {
        const data = await res.json();
        setVideos(data.videos);
      }
    } catch {
      // keep existing
    }
  }

  async function handleDelete(videoId: string) {
    try {
      const res = await fetch(`/api/videos/${videoId}`, { method: 'DELETE' });
      if (res.ok) {
        setVideos((prev) => prev.filter((v) => v.id !== videoId));
      }
    } catch {
      // silently fail
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Video Breakdowns</h2>
        {user && !showForm && (
          <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
            Add Video
          </Button>
        )}
      </div>

      {showForm && (
        <div className="rounded-lg border p-4">
          <VideoSubmitForm
            playerId={playerId}
            onSubmitted={() => {
              setShowForm(false);
              refresh();
            }}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {videos.length === 0 && !showForm ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          No video breakdowns for {playerName} yet.
          {user && ' Be the first to add one!'}
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {videos.map((video) => (
            <div key={video.id} className="space-y-2">
              <VideoEmbed
                platform={video.platform}
                embedId={video.embedId}
                title={video.title}
                timestamp={video.timestamp}
              />
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{video.title}</p>
                  <p className="text-xs text-muted-foreground">
                    by {video.authorName}
                  </p>
                  {video.tags && video.tags.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {video.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {user?.uid === video.authorId && (
                  <button
                    onClick={() => handleDelete(video.id)}
                    className="shrink-0 text-xs text-muted-foreground hover:text-destructive"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
