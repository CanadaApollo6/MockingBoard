import type { TeamDraftGrade, Player } from '@mockingboard/shared';
import { getGradeTier } from '@mockingboard/shared';
import { gradeHex, tierHex } from '@/lib/colors/grade-color';
import { getTeamColor } from '@/lib/colors/team-colors';
import { getTeamName } from '@/lib/teams';

interface RecapShareCardProps {
  draftName: string;
  draftDate: string;
  grade: TeamDraftGrade;
  players: Record<string, Player>;
}

const DIMENSIONS: { key: keyof TeamDraftGrade['scores']; label: string }[] = [
  { key: 'positionalValue', label: 'Positional' },
  { key: 'surplusValue', label: 'Surplus' },
  { key: 'needs', label: 'Needs' },
  { key: 'bpaAdherence', label: 'BPA' },
];

export function RecapShareCard({
  draftName,
  draftDate,
  grade,
  players,
}: RecapShareCardProps) {
  const colors = getTeamColor(grade.team);
  const teamName = getTeamName(grade.team);
  const tier = getGradeTier(grade.overallGrade);

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

      {/* Header: team name + grade */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 24,
        }}
      >
        <div>
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
        <div style={{ textAlign: 'right' }}>
          <div
            style={{
              fontSize: 48,
              fontWeight: 800,
              lineHeight: 1,
              color: tierHex(tier),
            }}
          >
            {grade.overallGrade}
          </div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: tierHex(tier),
              marginTop: 4,
            }}
          >
            {tier}
          </div>
        </div>
      </div>

      {/* Dimension bars */}
      <div style={{ marginBottom: 24 }}>
        {DIMENSIONS.map(({ key, label }) => {
          const value = grade.scores[key];
          return (
            <div
              key={key}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 12,
                fontSize: 12,
              }}
            >
              <span
                style={{
                  width: 70,
                  color: '#71717a',
                  flexShrink: 0,
                }}
              >
                {label}
              </span>
              <div
                style={{
                  flex: 1,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: '#27272a',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${value}%`,
                    height: '100%',
                    borderRadius: 4,
                    backgroundColor: gradeHex(value),
                  }}
                />
              </div>
              <span
                style={{
                  width: 28,
                  textAlign: 'right',
                  fontWeight: 600,
                  color: gradeHex(value),
                }}
              >
                {value}
              </span>
            </div>
          );
        })}
      </div>

      {/* Stats row */}
      {grade.tradeNetValue !== 0 && (
        <div
          style={{
            marginBottom: 20,
            fontSize: 12,
            color: '#71717a',
          }}
        >
          Trade value:{' '}
          <span
            style={{
              color: grade.tradeNetValue > 0 ? '#3dffa0' : '#ff4d6a',
            }}
          >
            {grade.tradeNetValue > 0 ? '+' : ''}
            {Math.round(grade.tradeNetValue)}
          </span>
        </div>
      )}

      {/* Picks table */}
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: 13,
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
            <th style={{ textAlign: 'left', padding: '6px 8px', width: 40 }}>
              #
            </th>
            <th style={{ textAlign: 'left', padding: '6px 8px' }}>Player</th>
            <th style={{ textAlign: 'center', padding: '6px 8px', width: 50 }}>
              Pos
            </th>
            <th style={{ textAlign: 'center', padding: '6px 8px', width: 50 }}>
              Grade
            </th>
          </tr>
        </thead>
        <tbody>
          {grade.picks.map((pick) => {
            const player = players[pick.playerId];
            const delta = pick.valueDelta;
            const nameColor =
              delta >= 5 ? '#3dffa0' : delta <= -5 ? '#ff4d6a' : '#fafafa';
            const deltaColor =
              delta > 0 ? '#3dffa0' : delta < 0 ? '#ff4d6a' : '#71717a';
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
                    padding: '7px 8px',
                    fontFamily: 'monospace',
                    color: '#71717a',
                  }}
                >
                  {pick.overall}
                </td>
                <td
                  style={{
                    padding: '7px 8px',
                    fontWeight: 500,
                    color: nameColor,
                  }}
                >
                  {player?.name ?? 'Unknown'}
                  <span
                    style={{
                      marginLeft: 4,
                      fontFamily: 'monospace',
                      fontSize: 11,
                      color: deltaColor,
                    }}
                  >
                    ({delta > 0 ? '+' : ''}
                    {delta})
                  </span>
                </td>
                <td style={{ textAlign: 'center', padding: '7px 8px' }}>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: '#a1a1aa',
                    }}
                  >
                    {pick.position}
                  </span>
                </td>
                <td style={{ textAlign: 'center', padding: '7px 8px' }}>
                  <span
                    style={{
                      fontWeight: 700,
                      color: gradeHex(pick.pickScore),
                    }}
                  >
                    {pick.pickScore}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

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
