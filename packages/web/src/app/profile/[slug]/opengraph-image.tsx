import { ImageResponse } from 'next/og';
import {
  getUserBySlug,
  getUserPublicBoards,
  getUserReports,
} from '@/lib/firebase/data';
import { getTeamColor } from '@/lib/colors/team-colors';

export const runtime = 'nodejs';
export const contentType = 'image/png';
export const size = { width: 1200, height: 630 };

export default async function OGImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await getUserBySlug(slug);

  if (!user) {
    return new ImageResponse(
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0a0a0b',
          color: '#fafafa',
          fontSize: 48,
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        Profile not found
      </div>,
      { ...size },
    );
  }

  const [boards, reports] = await Promise.all([
    getUserPublicBoards(user.id),
    getUserReports(user.id),
  ]);

  const teamColors = user.favoriteTeam
    ? getTeamColor(user.favoriteTeam)
    : { primary: '#3dffa0', secondary: '#8b5cf6' };

  const stats = [
    { label: 'Drafts', value: user.stats?.totalDrafts ?? 0 },
    { label: 'Boards', value: boards.length },
    { label: 'Reports', value: reports.length },
    ...(user.stats?.accuracyScore != null
      ? [{ label: 'Accuracy', value: `${user.stats.accuracyScore}%` }]
      : []),
  ];

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#0a0a0b',
        color: '#fafafa',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        padding: 60,
      }}
    >
      {/* Team color gradient bar */}
      <div
        style={{
          height: 6,
          borderRadius: 3,
          background: `linear-gradient(to right, ${teamColors.primary}, ${teamColors.secondary})`,
          marginBottom: 40,
        }}
      />

      {/* Profile header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
        {user.avatar ? (
          <img
            src={user.avatar}
            alt=""
            width={100}
            height={100}
            style={{ borderRadius: '50%', objectFit: 'cover' }}
          />
        ) : (
          <div
            style={{
              width: 100,
              height: 100,
              borderRadius: '50%',
              backgroundColor: '#27272a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 42,
              fontWeight: 700,
              color: '#71717a',
            }}
          >
            {user.displayName.charAt(0).toUpperCase()}
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              fontSize: 42,
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
                fontSize: 20,
                color: '#a1a1aa',
                marginTop: 6,
                maxWidth: 800,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {user.bio.length > 100
                ? `${user.bio.slice(0, 100)}...`
                : user.bio}
            </div>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div
        style={{
          display: 'flex',
          gap: 56,
          marginTop: 'auto',
          paddingTop: 32,
          borderTop: '1px solid #27272a',
        }}
      >
        {stats.map(({ label, value }) => (
          <div
            key={label}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <div style={{ fontSize: 36, fontWeight: 700 }}>{value}</div>
            <div
              style={{
                fontSize: 14,
                color: '#71717a',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginTop: 4,
              }}
            >
              {label}
            </div>
          </div>
        ))}
      </div>

      {/* Branding */}
      <div
        style={{
          marginTop: 32,
          paddingTop: 20,
          borderTop: '1px solid #27272a',
          fontSize: 16,
          color: '#52525b',
          textAlign: 'right',
          width: '100%',
        }}
      >
        MockingBoard
      </div>
    </div>,
    { ...size },
  );
}
