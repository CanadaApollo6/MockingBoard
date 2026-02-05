'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { teams } from '@mockingboard/shared';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ProfileEditor } from '@/components/profile-editor';
import { TEAM_COLORS, hexToHsl } from '@/lib/team-colors';
import { SCHOOL_COLORS } from '@/lib/school-colors';
import { cn } from '@/lib/utils';

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

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Left column: identity */}
        <div className="space-y-6">
          <AccountInfoSection profile={profile} />
          <AccountLinkingSection profile={profile} />
        </div>

        {/* Right column: profile & integrations */}
        <div className="space-y-6">
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
          <WebhookSection />
        </div>
      </div>

      {/* Full-width: color theme */}
      <TeamThemeSection />
    </div>
  );
}

const AFC_TEAMS = teams.filter((t) => t.conference === 'AFC');
const NFC_TEAMS = teams.filter((t) => t.conference === 'NFC');

function teamForeground(hex: string): string {
  const [, , l] = hexToHsl(hex);
  return l > 55 ? '#0a0a0b' : '#ffffff';
}

const SCHOOL_NAMES = Object.keys(SCHOOL_COLORS).sort();

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

function TeamThemeSection() {
  const { profile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(
    profile?.favoriteTeam ?? null,
  );
  const [selectedSchool, setSelectedSchool] = useState<string | null>(
    profile?.favoriteSchool ?? null,
  );
  const [schoolSearch, setSchoolSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSelectedTeam(profile?.favoriteTeam ?? null);
    setSelectedSchool(profile?.favoriteSchool ?? null);
  }, [profile?.favoriteTeam, profile?.favoriteSchool]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filteredSchools = useMemo(() => {
    if (!schoolSearch.trim()) return [];
    const q = schoolSearch.toLowerCase();
    return SCHOOL_NAMES.filter((s) => s.includes(q)).slice(0, 12);
  }, [schoolSearch]);

  async function save(body: { team?: string | null; school?: string | null }) {
    setSaving(true);
    try {
      await fetch('/api/settings/favorite-team', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } finally {
      setSaving(false);
    }
  }

  function handleSelectTeam(team: string | null) {
    if (team) {
      setSelectedTeam(team);
      setSelectedSchool(null);
      save({ team });
    } else {
      setSelectedTeam(null);
      setSelectedSchool(null);
      save({ team: null });
    }
  }

  function handleSelectSchool(school: string) {
    setSelectedSchool(school);
    setSelectedTeam(null);
    setSchoolSearch('');
    setShowDropdown(false);
    save({ school });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Color Theme</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Choose a favorite NFL team or college to customize accent colors
          across the app.
        </p>

        {/* NFL Teams */}
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          NFL
        </p>
        {(['AFC', 'NFC'] as const).map((conf) => {
          const confTeams = conf === 'AFC' ? AFC_TEAMS : NFC_TEAMS;
          return (
            <div key={conf}>
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                {conf}
              </p>
              <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-8">
                {confTeams.map((t) => {
                  const colors = TEAM_COLORS[t.id];
                  const isSelected = selectedTeam === t.id && !selectedSchool;
                  return (
                    <button
                      key={t.id}
                      onClick={() => handleSelectTeam(t.id)}
                      disabled={saving}
                      title={t.name}
                      className={cn(
                        'flex h-9 items-center justify-center rounded-md text-xs font-bold transition-all',
                        isSelected
                          ? 'ring-2 ring-ring ring-offset-2 ring-offset-background'
                          : 'opacity-80 hover:opacity-100',
                      )}
                      style={{
                        backgroundColor: colors.primary,
                        color: teamForeground(colors.primary),
                      }}
                    >
                      {t.id}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* College Search */}
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          College
        </p>
        <div ref={dropdownRef} className="relative">
          {selectedSchool && !schoolSearch ? (
            <div className="flex items-center gap-2">
              <span
                className="inline-block h-4 w-4 rounded-sm"
                style={{
                  backgroundColor:
                    SCHOOL_COLORS[selectedSchool]?.primary ?? '#6A6A72',
                }}
              />
              <span className="text-sm font-medium">
                {titleCase(selectedSchool)}
              </span>
              <button
                onClick={() => {
                  setSchoolSearch('');
                  setShowDropdown(true);
                }}
                className="ml-1 text-xs text-muted-foreground hover:text-foreground"
              >
                Change
              </button>
            </div>
          ) : (
            <input
              type="text"
              value={schoolSearch}
              onChange={(e) => {
                setSchoolSearch(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => {
                if (schoolSearch.trim()) setShowDropdown(true);
              }}
              placeholder="Search for a school..."
              className={inputClass}
            />
          )}
          {showDropdown && filteredSchools.length > 0 && (
            <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-md border bg-popover shadow-md">
              {filteredSchools.map((s) => {
                const colors = SCHOOL_COLORS[s];
                return (
                  <button
                    key={s}
                    onClick={() => handleSelectSchool(s)}
                    disabled={saving}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
                  >
                    <span
                      className="inline-block h-3 w-3 shrink-0 rounded-sm"
                      style={{ backgroundColor: colors.primary }}
                    />
                    {titleCase(s)}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Reset */}
        <button
          onClick={() => handleSelectTeam(null)}
          disabled={saving}
          className={cn(
            'w-full rounded-md border px-3 py-2 text-sm transition-colors',
            !selectedTeam && !selectedSchool
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-border text-muted-foreground hover:border-primary/50',
          )}
        >
          None (MockingBoard Green)
        </button>
      </CardContent>
    </Card>
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
