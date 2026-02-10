'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { getErrorMessage } from '@/lib/validate';

function sanitizeSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

const inputClass =
  'w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:shadow-[var(--shadow-glow)]';

const SOCIAL_FIELDS = [
  { key: 'youtube', label: 'YouTube', placeholder: 'https://youtube.com/@...' },
  { key: 'twitter', label: 'Twitter / X', placeholder: 'https://x.com/...' },
  { key: 'bluesky', label: 'Bluesky', placeholder: 'https://bsky.app/...' },
  { key: 'website', label: 'Website', placeholder: 'https://...' },
] as const;

export function ProfilePageClient() {
  const { profile } = useAuth();

  const [slug, setSlug] = useState(profile?.slug ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [avatar, setAvatar] = useState(profile?.avatar ?? '');
  const [youtube, setYoutube] = useState(profile?.links?.youtube ?? '');
  const [twitter, setTwitter] = useState(profile?.links?.twitter ?? '');
  const [bluesky, setBluesky] = useState(profile?.links?.bluesky ?? '');
  const [website, setWebsite] = useState(profile?.links?.website ?? '');
  const [isPublic, setIsPublic] = useState(profile?.isPublic ?? false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  if (!profile) return null;

  const socialState: Record<
    string,
    { value: string; set: (v: string) => void }
  > = {
    youtube: { value: youtube, set: setYoutube },
    twitter: { value: twitter, set: setTwitter },
    bluesky: { value: bluesky, set: setBluesky },
    website: { value: website, set: setWebsite },
  };

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
      setMessage(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const hasPublicProfile = isPublic && slug;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/settings"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold">Edit Profile</h1>
        </div>
        {hasPublicProfile && (
          <Link
            href={`/profile/${slug}`}
            className="flex items-center gap-1.5 text-sm text-mb-accent hover:underline"
          >
            View Profile
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>

      {/* Avatar */}
      <div className="space-y-3">
        <label className="block text-sm font-medium">Avatar</label>
        <div className="flex items-center gap-4">
          {avatar ? (
            <img
              src={avatar}
              alt=""
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-xl font-bold text-muted-foreground">
              {profile.displayName.charAt(0).toUpperCase()}
            </div>
          )}
          <input
            type="url"
            value={avatar}
            onChange={(e) => setAvatar(e.target.value)}
            placeholder="https://..."
            className={inputClass}
          />
        </div>
      </div>

      {/* Visibility */}
      <div className="space-y-2">
        <label className="block text-sm font-medium">Profile Visibility</label>
        <p className="text-xs text-muted-foreground">
          Public profiles appear in the community and can be shared.
        </p>
        <div className="flex gap-2">
          <Button
            variant={!isPublic ? 'default' : 'outline'}
            size="sm"
            onClick={() => setIsPublic(false)}
          >
            Private
          </Button>
          <Button
            variant={isPublic ? 'default' : 'outline'}
            size="sm"
            onClick={() => setIsPublic(true)}
          >
            Public
          </Button>
        </div>
      </div>

      {isPublic && (
        <>
          {/* Username */}
          <div className="space-y-2">
            <label className="block text-sm font-medium">Username</label>
            <div className="flex items-center gap-2">
              <span className="shrink-0 text-sm text-muted-foreground">
                mockingboard.com/profile/
              </span>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(sanitizeSlug(e.target.value))}
                placeholder="your-name"
                className={inputClass}
              />
            </div>
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <label className="block text-sm font-medium">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell the community about your scouting background..."
              rows={3}
              maxLength={280}
              className={`${inputClass} resize-none`}
            />
            <p className="text-right text-xs text-muted-foreground">
              {bio.length}/280
            </p>
          </div>

          {/* Social Links */}
          <div className="space-y-3">
            <label className="block text-sm font-medium">Social Links</label>
            {SOCIAL_FIELDS.map(({ key, label, placeholder }) => {
              const { value, set } = socialState[key];
              return (
                <div key={key}>
                  <label className="mb-1 block text-xs text-muted-foreground">
                    {label}
                  </label>
                  <input
                    type="url"
                    value={value}
                    onChange={(e) => set(e.target.value)}
                    placeholder={placeholder}
                    className={inputClass}
                  />
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Save */}
      <div className="flex items-center gap-3 border-t pt-6">
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
