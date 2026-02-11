import type { PickScore } from '@/lib/scoring';

interface ReceiptShareCardProps {
  displayName: string;
  draftName: string;
  year: number;
  pickScores: PickScore[];
  percentage: number;
}

export function ReceiptShareCard({
  displayName,
  draftName,
  year,
  pickScores,
  percentage,
}: ReceiptShareCardProps) {
  const hits = pickScores.filter((p) => p.playerMatch);
  const teamMatches = pickScores.filter((p) => p.teamMatch).length;
  const positionMatches = pickScores.filter((p) => p.positionMatch).length;

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
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <div>
          <div
            style={{
              fontSize: 14,
              color: '#71717a',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Prediction Receipt
          </div>
          <div
            style={{
              fontSize: 24,
              fontWeight: 700,
              marginTop: 4,
              letterSpacing: '-0.02em',
            }}
          >
            {displayName}
          </div>
          <div style={{ fontSize: 14, color: '#a1a1aa', marginTop: 2 }}>
            {draftName} &middot; {year} NFL Draft
          </div>
        </div>
        <div
          style={{
            fontSize: 48,
            fontWeight: 700,
            color:
              percentage >= 50
                ? '#22c55e'
                : percentage >= 25
                  ? '#eab308'
                  : '#a1a1aa',
            lineHeight: 1,
          }}
        >
          {percentage}%
        </div>
      </div>

      {/* Accent bar */}
      <div
        style={{
          height: 3,
          borderRadius: 2,
          background: 'linear-gradient(to right, #22c55e, #3b82f6)',
          marginTop: 20,
          marginBottom: 20,
        }}
      />

      {/* Player hits */}
      {hits.length > 0 && (
        <div>
          <div
            style={{
              fontSize: 12,
              color: '#71717a',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: 12,
            }}
          >
            I Called It
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {hits.map((hit) => (
              <div
                key={hit.overall}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 14px',
                  backgroundColor: 'rgba(34, 197, 94, 0.1)',
                  borderRadius: 8,
                  border: '1px solid rgba(34, 197, 94, 0.2)',
                }}
              >
                <div
                  style={{
                    fontSize: 20,
                    lineHeight: 1,
                  }}
                >
                  &#x2713;
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>
                    Pick #{hit.overall}: {hit.playerPicked}
                  </div>
                  {hit.teamMatch && (
                    <div
                      style={{ fontSize: 12, color: '#a1a1aa', marginTop: 2 }}
                    >
                      Correct team + player
                    </div>
                  )}
                </div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: '#22c55e',
                    fontFamily: 'monospace',
                  }}
                >
                  {hit.score}/100
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {hits.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: '24px 0',
            color: '#71717a',
            fontSize: 14,
          }}
        >
          No exact player matches — but there&apos;s always next year
        </div>
      )}

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
        {[
          { label: 'Accuracy', value: `${percentage}%` },
          { label: 'Player Hits', value: hits.length },
          { label: 'Team Matches', value: teamMatches },
          { label: 'Position Matches', value: positionMatches },
          { label: 'Total Picks', value: pickScores.length },
        ].map(({ label, value }) => (
          <div key={label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{value}</div>
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

      {/* Footer */}
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
