import { notFound } from 'next/navigation';
import { getScoutProfileBySlug, getScoutContributedPlayers } from '@/lib/data';
import { Badge } from '@/components/ui/badge';
import { getPositionColor } from '@/lib/position-colors';

const TIER_LABELS: Record<string, string> = {
  contributor: 'Contributor',
  scout: 'Scout',
  elite: 'Elite Scout',
};

const LINK_ICONS: Record<string, { label: string; prefix: string }> = {
  youtube: { label: 'YouTube', prefix: 'https://youtube.com/' },
  twitter: { label: 'Twitter / X', prefix: 'https://x.com/' },
  bluesky: { label: 'Bluesky', prefix: 'https://bsky.app/profile/' },
  website: { label: 'Website', prefix: '' },
};

export default async function ScoutProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const profile = await getScoutProfileBySlug(slug);
  if (!profile) notFound();

  // Default to 2026 for now; could be configurable later
  const players = await getScoutContributedPlayers(profile.id, 2026);

  const socialLinks = profile.links
    ? Object.entries(profile.links).filter(([, url]) => url && url.length > 0)
    : [];

  return (
    <main className="mx-auto max-w-screen-xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex items-start gap-4">
        {profile.avatar && (
          <img
            src={profile.avatar}
            alt=""
            className="h-16 w-16 rounded-full object-cover"
          />
        )}
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{profile.name}</h1>
            {profile.tier && (
              <Badge variant="outline">{TIER_LABELS[profile.tier]}</Badge>
            )}
          </div>
          {profile.bio && (
            <p className="mt-1 text-sm text-muted-foreground">{profile.bio}</p>
          )}
        </div>
      </div>

      {/* Social links */}
      {socialLinks.length > 0 && (
        <div className="mb-8 flex flex-wrap gap-2">
          {socialLinks.map(([key, url]) => {
            const config = LINK_ICONS[key];
            if (!config) return null;
            const href = url!.startsWith('http')
              ? url!
              : `${config.prefix}${url}`;
            return (
              <a
                key={key}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-colors hover:bg-muted"
              >
                {config.label}
              </a>
            );
          })}
        </div>
      )}

      {/* Contribution stats */}
      {profile.stats && (
        <div className="mb-8 flex gap-6">
          <div>
            <p className="text-2xl font-bold">
              {profile.stats.playersContributed}
            </p>
            <p className="text-xs text-muted-foreground">Players</p>
          </div>
          <div>
            <p className="text-2xl font-bold">
              {profile.stats.positionsCovered.length}
            </p>
            <p className="text-xs text-muted-foreground">Positions</p>
          </div>
        </div>
      )}

      {/* Player list */}
      <h2 className="mb-4 text-lg font-semibold">Contributed Players</h2>
      {players.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">
          No player data contributed yet.
        </p>
      ) : (
        <div className="overflow-hidden rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-card">
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="w-12 p-2">#</th>
                <th className="p-2">Player</th>
                <th className="w-14 p-2">Pos</th>
                <th className="hidden p-2 sm:table-cell">School</th>
              </tr>
            </thead>
            <tbody>
              {players.map((player) => (
                <tr key={player.id} className="border-b">
                  <td className="p-2 font-mono text-muted-foreground">
                    {player.consensusRank >= 9999 ? 'NR' : player.consensusRank}
                  </td>
                  <td className="p-2 font-medium">{player.name}</td>
                  <td className="p-2">
                    <Badge
                      style={{
                        backgroundColor: getPositionColor(player.position),
                        color: '#0A0A0B',
                      }}
                      className="text-xs"
                    >
                      {player.position}
                    </Badge>
                  </td>
                  <td className="hidden p-2 text-muted-foreground sm:table-cell">
                    {player.school}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
