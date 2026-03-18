import type {
  Pick,
  Player,
  TeamAbbreviation,
  Trade,
  TradePiece,
} from '@mockingboard/shared';
import { getTeamName } from '@/lib/teams';
import { getTeamColor } from '@/lib/colors/team-colors';
import { getPositionColor } from '@/lib/colors/position-colors';

function formatPiece(piece: TradePiece): string {
  if (piece.type === 'current-pick') {
    return `Pick #${piece.overall}`;
  }
  return `${piece.year} Rd ${piece.round} (${getTeamName(piece.originalTeam as TeamAbbreviation)})`;
}

interface MyTeamShareCardProps {
  draftName: string;
  draftDate: string;
  team: TeamAbbreviation;
  picks: Pick[];
  players: Record<string, Player>;
  trades?: Trade[];
}

export function MyTeamShareCard({
  draftName,
  draftDate,
  team,
  picks,
  players,
  trades = [],
}: MyTeamShareCardProps) {
  const colors = getTeamColor(team);
  const teamName = getTeamName(team);

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
          background: `linear-gradient(to right, ${colors.primary}, ${colors.secondary})`,
          marginBottom: 20,
        }}
      />

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div
          style={{
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: '-0.02em',
          }}
        >
          {teamName}
        </div>
        <div style={{ fontSize: 13, color: '#71717a', marginTop: 4 }}>
          {draftName} &middot; {draftDate}
        </div>
      </div>

      {/* Picks */}
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: 14,
        }}
      >
        <thead>
          <tr
            style={{
              borderBottom: '1px solid #27272a',
              color: '#71717a',
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            <th
              style={{
                textAlign: 'left',
                padding: '6px 8px',
                width: 50,
              }}
            >
              #
            </th>
            <th
              style={{
                textAlign: 'left',
                padding: '6px 8px',
                width: 80,
              }}
            >
              Rd.Pick
            </th>
            <th style={{ textAlign: 'left', padding: '6px 8px' }}>Player</th>
            <th
              style={{
                textAlign: 'center',
                padding: '6px 8px',
                width: 60,
              }}
            >
              Pos
            </th>
            <th style={{ textAlign: 'left', padding: '6px 8px' }}>School</th>
            <th
              style={{
                textAlign: 'right',
                padding: '6px 8px',
                width: 60,
              }}
            >
              Rank
            </th>
          </tr>
        </thead>
        <tbody>
          {picks.map((pick) => {
            const player = players[pick.playerId];
            return (
              <tr
                key={pick.overall}
                style={{
                  borderBottom: '1px solid #1c1c1e',
                  borderLeft: `3px solid ${colors.primary}`,
                }}
              >
                <td
                  style={{
                    padding: '8px 8px',
                    fontFamily: 'monospace',
                    color: '#71717a',
                  }}
                >
                  {pick.overall}
                </td>
                <td
                  style={{
                    padding: '8px 8px',
                    fontFamily: 'monospace',
                    color: '#a1a1aa',
                  }}
                >
                  {pick.round}.{pick.pick}
                </td>
                <td style={{ padding: '8px 8px', fontWeight: 500 }}>
                  {player?.name ?? 'Unknown'}
                </td>
                <td style={{ textAlign: 'center', padding: '8px 8px' }}>
                  {player?.position && (
                    <span
                      style={{
                        backgroundColor: getPositionColor(player.position),
                        color: '#0a0a0b',
                        fontSize: 11,
                        fontWeight: 600,
                        padding: '2px 6px',
                        borderRadius: 4,
                      }}
                    >
                      {player.position}
                    </span>
                  )}
                </td>
                <td style={{ padding: '8px 8px', color: '#a1a1aa' }}>
                  {player?.school ?? '—'}
                </td>
                <td
                  style={{
                    textAlign: 'right',
                    padding: '8px 8px',
                    fontFamily: 'monospace',
                    color: '#71717a',
                  }}
                >
                  {player?.consensusRank ?? '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Trades */}
      {trades.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: '#71717a',
              marginBottom: 8,
            }}
          >
            Trades
          </div>
          {trades.map((trade, i) => {
            const isProposer = trade.proposerTeam === team;
            const otherTeam = isProposer
              ? trade.recipientTeam
              : trade.proposerTeam;
            const sent = isProposer
              ? trade.proposerGives
              : trade.proposerReceives;
            const received = isProposer
              ? trade.proposerReceives
              : trade.proposerGives;
            return (
              <div
                key={trade.id ?? i}
                style={{
                  padding: '8px 10px',
                  borderLeft: `3px solid ${colors.primary}`,
                  borderBottom: '1px solid #1c1c1e',
                  fontSize: 13,
                }}
              >
                <div style={{ color: '#a1a1aa', marginBottom: 2 }}>
                  Trade with{' '}
                  <span style={{ color: '#fafafa', fontWeight: 500 }}>
                    {getTeamName(otherTeam)}
                  </span>
                </div>
                <div style={{ color: '#71717a' }}>
                  <span style={{ color: '#ef4444' }}>Sent:</span>{' '}
                  {sent.map(formatPiece).join(', ')}
                  {' · '}
                  <span style={{ color: '#22c55e' }}>Received:</span>{' '}
                  {received.map(formatPiece).join(', ')}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer */}
      <div
        style={{
          marginTop: 16,
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
