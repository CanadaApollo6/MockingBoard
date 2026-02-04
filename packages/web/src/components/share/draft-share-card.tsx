import type { Pick, Player, TeamAbbreviation } from '@mockingboard/shared';
import { getTeamName } from '@/lib/teams';
import { buildRowColors } from '@/lib/team-colors';
import { getPositionColor } from '@/lib/position-colors';

interface DraftShareCardProps {
  draftName: string;
  draftDate: string;
  participantCount: number;
  picks: Pick[];
  players: Record<string, Player>;
}

export function DraftShareCard({
  draftName,
  draftDate,
  participantCount,
  picks,
  players,
}: DraftShareCardProps) {
  const colorMap = buildRowColors(picks);

  // Group by round
  const rounds = new Map<number, Pick[]>();
  for (const pick of picks) {
    const items = rounds.get(pick.round) ?? [];
    items.push(pick);
    rounds.set(pick.round, items);
  }

  return (
    <div
      style={{
        width: 1200,
        backgroundColor: '#0a0a0b',
        color: '#fafafa',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        padding: 32,
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: '-0.02em',
          }}
        >
          {draftName}
        </div>
        <div
          style={{
            fontSize: 14,
            color: '#a1a1aa',
            marginTop: 4,
            display: 'flex',
            gap: 16,
          }}
        >
          <span>{draftDate}</span>
          <span>
            {participantCount} drafter{participantCount !== 1 ? 's' : ''}
          </span>
          <span>
            {rounds.size} round{rounds.size !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Rounds */}
      {Array.from(rounds.entries()).map(([round, roundPicks]) => (
        <div key={round} style={{ marginBottom: 20 }}>
          {rounds.size > 1 && (
            <div
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: '#71717a',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: 8,
              }}
            >
              Round {round}
            </div>
          )}
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
                <th style={{ textAlign: 'left', padding: '6px 8px' }}>Team</th>
                <th style={{ textAlign: 'left', padding: '6px 8px' }}>
                  Player
                </th>
                <th
                  style={{
                    textAlign: 'center',
                    padding: '6px 8px',
                    width: 60,
                  }}
                >
                  Pos
                </th>
                <th style={{ textAlign: 'left', padding: '6px 8px' }}>
                  School
                </th>
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
              {roundPicks.map((pick) => {
                const player = players[pick.playerId];
                const teamColor = colorMap.get(pick.overall) ?? '#444';
                const isCpu = pick.userId === null;
                return (
                  <tr
                    key={pick.overall}
                    style={{
                      borderBottom: '1px solid #1c1c1e',
                      borderLeft: `3px solid ${teamColor}`,
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
                    <td style={{ padding: '8px 8px', fontWeight: 500 }}>
                      {getTeamName(pick.team as TeamAbbreviation)}
                    </td>
                    <td style={{ padding: '8px 8px' }}>
                      <span style={{ fontWeight: 500 }}>
                        {player?.name ?? 'Unknown'}
                      </span>
                      {isCpu && (
                        <span
                          style={{
                            marginLeft: 8,
                            fontSize: 10,
                            padding: '1px 5px',
                            border: '1px solid #3f3f46',
                            borderRadius: 4,
                            color: '#a1a1aa',
                          }}
                        >
                          CPU
                        </span>
                      )}
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
        </div>
      ))}

      {/* Footer / branding */}
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
