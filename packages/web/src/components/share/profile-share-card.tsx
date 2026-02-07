import type { User } from '@mockingboard/shared';
import { getTeamColor } from '@/lib/team-colors';

interface ProfileShareCardProps {
  user: User;
  boardCount: number;
  reportCount: number;
}

export function ProfileShareCard({
  user,
  boardCount,
  reportCount,
}: ProfileShareCardProps) {
  const teamColors = user.favoriteTeam
    ? getTeamColor(user.favoriteTeam)
    : { primary: '#3b82f6', secondary: '#8b5cf6' };

  const stats = [
    { label: 'Drafts', value: user.stats?.totalDrafts ?? 0 },
    { label: 'Picks', value: user.stats?.totalPicks ?? 0 },
    { label: 'Boards', value: boardCount },
    { label: 'Reports', value: reportCount },
    ...(user.stats?.accuracyScore != null
      ? [{ label: 'Accuracy', value: `${user.stats.accuracyScore}%` }]
      : []),
  ];

  const links = Object.entries(user.links ?? {}).filter(([, url]) => url) as [
    string,
    string,
  ][];

  return (
    <div
      style={{
        width: 800,
        backgroundColor: '#0a0a0b',
        color: '#fafafa',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        padding: 32,
      }}
    >
      {/* Team color gradient bar */}
      <div
        style={{
          height: 4,
          borderRadius: 2,
          background: `linear-gradient(to right, ${teamColors.primary}, ${teamColors.secondary})`,
          marginBottom: 24,
        }}
      />

      {/* Profile header */}
      <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
        {user.avatar ? (
          <img
            src={user.avatar}
            alt=""
            style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              objectFit: 'cover',
            }}
          />
        ) : (
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              backgroundColor: '#27272a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 32,
              fontWeight: 700,
              color: '#71717a',
            }}
          >
            {user.displayName.charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <div
            style={{
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: '-0.02em',
              textTransform: 'uppercase',
            }}
          >
            {user.displayName}
          </div>
          {user.bio && (
            <div
              style={{
                fontSize: 14,
                color: '#a1a1aa',
                marginTop: 4,
                maxWidth: 600,
              }}
            >
              {user.bio}
            </div>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div
        style={{
          display: 'flex',
          gap: 32,
          marginTop: 24,
          paddingTop: 20,
          borderTop: '1px solid #27272a',
        }}
      >
        {stats.map(({ label, value }) => (
          <div key={label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{value}</div>
            <div
              style={{
                fontSize: 11,
                color: '#71717a',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginTop: 2,
              }}
            >
              {label}
            </div>
          </div>
        ))}
      </div>

      {/* Social links */}
      {links.length > 0 && (
        <div
          style={{
            display: 'flex',
            gap: 16,
            marginTop: 20,
            fontSize: 13,
            color: '#a1a1aa',
          }}
        >
          {links.map(([platform]) => (
            <span key={platform} style={{ textTransform: 'capitalize' }}>
              {platform}
            </span>
          ))}
        </div>
      )}

      {/* Footer / branding */}
      <div
        style={{
          marginTop: 20,
          paddingTop: 16,
          borderTop: '1px solid #27272a',
          fontSize: 12,
          color: '#52525b',
          textAlign: 'right',
        }}
      >
        MockingBoard
      </div>
    </div>
  );
}
