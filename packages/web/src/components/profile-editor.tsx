'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface ProfileEditorProps {
  initial: {
    slug?: string;
    bio?: string;
    avatar?: string;
    links?: {
      youtube?: string;
      twitter?: string;
      bluesky?: string;
      website?: string;
    };
    isPublic?: boolean;
  };
}

function sanitizeSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function ProfileEditor({ initial }: ProfileEditorProps) {
  const [slug, setSlug] = useState(initial.slug ?? '');
  const [bio, setBio] = useState(initial.bio ?? '');
  const [avatar, setAvatar] = useState(initial.avatar ?? '');
  const [youtube, setYoutube] = useState(initial.links?.youtube ?? '');
  const [twitter, setTwitter] = useState(initial.links?.twitter ?? '');
  const [bluesky, setBluesky] = useState(initial.links?.bluesky ?? '');
  const [website, setWebsite] = useState(initial.links?.website ?? '');
  const [isPublic, setIsPublic] = useState(initial.isPublic ?? false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  async function handleSave() {
    setSaving(true);
    setMessage('');

    try {
      const links: Record<string, string> = {};
      if (youtube.trim()) links.youtube = youtube.trim();
      if (twitter.trim()) links.twitter = twitter.trim();
      if (bluesky.trim()) links.bluesky = bluesky.trim();
      if (website.trim()) links.website = website.trim();

      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: slug.trim() || undefined,
          bio: bio.trim() || undefined,
          avatar: avatar.trim() || undefined,
          links: Object.keys(links).length > 0 ? links : undefined,
          isPublic,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save');
      }

      setMessage('Profile saved.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">Public Profile</h2>

      <div className="flex items-center gap-3">
        <label className="text-sm font-medium">Visibility</label>
        <div className="flex gap-2">
          <Button
            variant={!isPublic ? 'default' : 'outline'}
            size="xs"
            onClick={() => setIsPublic(false)}
          >
            Private
          </Button>
          <Button
            variant={isPublic ? 'default' : 'outline'}
            size="xs"
            onClick={() => setIsPublic(true)}
          >
            Public
          </Button>
        </div>
      </div>

      {isPublic && (
        <>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Username (URL slug)
            </label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                mockingboard.com/profile/
              </span>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(sanitizeSlug(e.target.value))}
                placeholder="your-name"
                className="flex-1 rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Bio
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell the community about your scouting background..."
              rows={3}
              maxLength={280}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="mt-0.5 text-right text-xs text-muted-foreground">
              {bio.length}/280
            </p>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Avatar URL
            </label>
            <input
              type="text"
              value={avatar}
              onChange={(e) => setAvatar(e.target.value)}
              placeholder="https://..."
              className="w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Social Links
            </p>
            {[
              { label: 'YouTube', value: youtube, set: setYoutube },
              { label: 'Twitter / X', value: twitter, set: setTwitter },
              { label: 'Bluesky', value: bluesky, set: setBluesky },
              { label: 'Website', value: website, set: setWebsite },
            ].map(({ label, value, set }) => (
              <div key={label} className="flex items-center gap-2">
                <span className="w-20 text-xs text-muted-foreground">
                  {label}
                </span>
                <input
                  type="text"
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  placeholder={`https://...`}
                  className="flex-1 rounded-md border bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            ))}
          </div>
        </>
      )}

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Profile'}
        </Button>
        {message && (
          <span
            className={`text-sm ${message.includes('saved') ? 'text-mb-success' : 'text-mb-danger'}`}
          >
            {message}
          </span>
        )}
      </div>
    </div>
  );
}
