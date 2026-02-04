import type { TeamDraftGrade, Player } from '@mockingboard/shared';
import { getGradeTier } from '@mockingboard/shared';
import { getTeamColor } from '@/lib/team-colors';
import { getTeamName } from '@/lib/teams';

interface RecapShareCardProps {
  draftName: string;
  draftDate: string;
  grade: TeamDraftGrade;
  players: Record<string, Player>;
}

function gradeHex(grade: number): string {
  if (grade >= 80) return '#3dffa0';
  if (grade >= 60) return '#60a5fa';
  if (grade >= 40) return '#ffb84d';
  return '#ff4d6a';
}

function labelText(label: string): string {
  switch (label) {
    case 'great-value':
      return 'Steal';
    case 'good-value':
      return 'Value';
    case 'fair':
      return 'Fair';
    case 'slight-reach':
      return 'Slight Reach';
    case 'reach':
      return 'Reach';
    case 'big-reach':
      return 'Big Reach';
    default:
      return label;
  }
}

function labelColor(label: string): string {
  if (label === 'great-value' || label === 'good-value') return '#3dffa0';
  if (label === 'big-reach' || label === 'reach') return '#ff4d6a';
  if (label === 'slight-reach') return '#ffb84d';
  return '#71717a';
}

const DIMENSIONS: { key: keyof TeamDraftGrade['scores']; label: string }[] = [
  { key: 'value', label: 'Value' },
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
              color: gradeHex(grade.overallGrade),
            }}
          >
            {grade.overallGrade}
          </div>
          <div style={{ fontSize: 13, color: '#71717a', marginTop: 4 }}>
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
                marginBottom: 6,
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
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: '#27272a',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${value}%`,
                    height: '100%',
                    borderRadius: 3,
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
      <div
        style={{
          display: 'flex',
          gap: 24,
          marginBottom: 20,
          fontSize: 12,
          color: '#71717a',
        }}
      >
        <span>
          Needs: {grade.needsFilled}/{grade.totalNeeds}
        </span>
        {grade.tradeNetValue !== 0 && (
          <span>
            Trade value:{' '}
            <span
              style={{
                color: grade.tradeNetValue > 0 ? '#3dffa0' : '#ff4d6a',
              }}
            >
              {grade.tradeNetValue > 0 ? '+' : ''}
              {Math.round(grade.tradeNetValue)}
            </span>
          </span>
        )}
      </div>

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
            <th style={{ textAlign: 'center', padding: '6px 8px', width: 90 }}>
              Label
            </th>
            <th style={{ textAlign: 'right', padding: '6px 8px', width: 45 }}>
              +/-
            </th>
          </tr>
        </thead>
        <tbody>
          {grade.picks.map((pick) => {
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
                    padding: '7px 8px',
                    fontFamily: 'monospace',
                    color: '#71717a',
                  }}
                >
                  {pick.overall}
                </td>
                <td style={{ padding: '7px 8px', fontWeight: 500 }}>
                  {player?.name ?? 'Unknown'}
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
                <td style={{ textAlign: 'center', padding: '7px 8px' }}>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: labelColor(pick.label),
                    }}
                  >
                    {labelText(pick.label)}
                  </span>
                </td>
                <td
                  style={{
                    textAlign: 'right',
                    padding: '7px 8px',
                    fontFamily: 'monospace',
                    fontSize: 12,
                    color:
                      pick.valueDelta > 0
                        ? '#3dffa0'
                        : pick.valueDelta < 0
                          ? '#ff4d6a'
                          : '#71717a',
                  }}
                >
                  {pick.valueDelta > 0 ? '+' : ''}
                  {pick.valueDelta}
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
