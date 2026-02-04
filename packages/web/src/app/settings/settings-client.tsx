'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ProfileEditor } from '@/components/profile-editor';

const inputClass =
  'w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:shadow-[var(--shadow-glow)]';

export function SettingsClient() {
  const { profile } = useAuth();
  const searchParams = useSearchParams();

  const [banner, setBanner] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Read URL params for success/error from OAuth redirect
  useEffect(() => {
    const linked = searchParams.get('linked');
    const error = searchParams.get('error');

    if (linked === 'discord') {
      setBanner({ type: 'success', message: 'Discord account linked.' });
    } else if (error === 'discord_already_linked') {
      setBanner({
        type: 'error',
        message: 'That Discord account is already linked to another user.',
      });
    } else if (error === 'not_authenticated') {
      setBanner({
        type: 'error',
        message: 'You must be logged in to link accounts.',
      });
    }
  }, [searchParams]);

  if (!profile) return null;

  return (
    <div className="space-y-6">
      {banner && (
        <div
          className={`rounded-md px-4 py-3 text-sm ${
            banner.type === 'success'
              ? 'border border-green-500/30 bg-green-500/10 text-green-400'
              : 'border border-destructive/30 bg-destructive/10 text-destructive'
          }`}
        >
          {banner.message}
        </div>
      )}

      <AccountInfoSection profile={profile} />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileEditor
            initial={{
              slug: profile.slug,
              bio: profile.bio,
              avatar: profile.avatar,
              links: profile.links,
              isPublic: profile.isPublic,
            }}
          />
        </CardContent>
      </Card>

      <AccountLinkingSection profile={profile} />
      <WebhookSection />
    </div>
  );
}

function AccountInfoSection({
  profile,
}: {
  profile: NonNullable<ReturnType<typeof useAuth>['profile']>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Account Info</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Display Name</span>
          <span className="text-sm font-medium">{profile.displayName}</span>
        </div>
        {profile.email && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Email</span>
            <span className="text-sm font-medium">{profile.email}</span>
          </div>
        )}
        {profile.discordUsername && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Discord</span>
            <span className="text-sm font-medium">
              {profile.discordUsername}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AccountLinkingSection({
  profile,
}: {
  profile: NonNullable<ReturnType<typeof useAuth>['profile']>;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const bothLinked = profile.hasDiscord && !!profile.email;

  async function handleLinkEmail(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/email/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to link email');
      }

      setSuccess(true);
      setEmail('');
      setPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to link email');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Account Linking</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {bothLinked ? (
          <div className="flex items-center gap-2">
            <Badge variant="secondary">All accounts linked</Badge>
          </div>
        ) : (
          <>
            {!profile.hasDiscord && (
              <div>
                <p className="mb-2 text-sm text-muted-foreground">
                  Link your Discord account to sync drafts from the bot.
                </p>
                <a href="/api/auth/discord?link=true">
                  <Button variant="outline" className="w-full">
                    Link Discord Account
                  </Button>
                </a>
              </div>
            )}

            {!profile.hasDiscord && !profile.email && <Separator />}

            {!profile.email && (
              <div>
                <p className="mb-2 text-sm text-muted-foreground">
                  Add an email and password so you can sign in without Discord.
                </p>
                {success ? (
                  <p className="text-sm text-green-400">
                    Email linked successfully.
                  </p>
                ) : (
                  <form onSubmit={handleLinkEmail} className="space-y-3">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      className={inputClass}
                    />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      required
                      minLength={6}
                      className={inputClass}
                    />
                    {error && (
                      <p className="text-sm text-destructive">{error}</p>
                    )}
                    <Button
                      type="submit"
                      variant="outline"
                      className="w-full"
                      disabled={loading}
                    >
                      {loading ? 'Linking...' : 'Link Email & Password'}
                    </Button>
                  </form>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function WebhookSection() {
  const [url, setUrl] = useState('');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState<'save' | 'test' | 'remove' | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [testSuccess, setTestSuccess] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setTestSuccess(false);
    setLoading('save');

    try {
      const res = await fetch('/api/settings/webhook', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save');
      }

      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setLoading(null);
    }
  }

  async function handleTest() {
    setError(null);
    setTestSuccess(false);
    setLoading('test');

    try {
      const res = await fetch('/api/settings/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Test failed');
      }

      setTestSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Test failed');
    } finally {
      setLoading(null);
    }
  }

  async function handleRemove() {
    setError(null);
    setTestSuccess(false);
    setLoading('remove');

    try {
      const res = await fetch('/api/settings/webhook', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: null }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to remove');
      }

      setUrl('');
      setSaved(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove');
    } finally {
      setLoading(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Discord Webhook</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Add a Discord webhook URL to receive draft notifications in your
          server. You can create one in your Discord server&apos;s channel
          settings under Integrations.
        </p>
        <form onSubmit={handleSave} className="space-y-3">
          <input
            type="url"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setSaved(false);
              setTestSuccess(false);
            }}
            placeholder="https://discord.com/api/webhooks/..."
            className={inputClass}
          />

          {error && <p className="text-sm text-destructive">{error}</p>}
          {testSuccess && (
            <p className="text-sm text-green-400">
              Webhook test successful — check your Discord channel.
            </p>
          )}

          <div className="flex gap-2">
            <Button
              type="submit"
              variant="outline"
              disabled={!url || loading !== null}
              className="flex-1"
            >
              {loading === 'save' ? 'Saving...' : saved ? 'Saved' : 'Save'}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!url || loading !== null}
              onClick={handleTest}
              className="flex-1"
            >
              {loading === 'test' ? 'Testing...' : 'Test'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={loading !== null}
              onClick={handleRemove}
            >
              {loading === 'remove' ? 'Removing...' : 'Remove'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
