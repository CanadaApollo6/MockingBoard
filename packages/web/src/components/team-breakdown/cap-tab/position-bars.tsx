import type { PlayerContract } from '@mockingboard/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getPositionColor } from '@/lib/colors/position-colors';
import { normalizePlayerName, fmtDollar } from '@/lib/firebase/format';

const POSITION_GROUPS = [
  { label: 'QB', positions: ['QB'] },
  { label: 'Skill', positions: ['WR', 'TE', 'RB', 'FB'] },
  { label: 'O-Line', positions: ['OL', 'OT', 'OG', 'C', 'G'] },
  { label: 'D-Line', positions: ['DL', 'DT', 'DE', 'NT'] },
  { label: 'EDGE', positions: ['EDGE'] },
  { label: 'LB', positions: ['LB', 'ILB', 'OLB'] },
  { label: 'Secondary', positions: ['CB', 'S', 'FS', 'SS', 'DB'] },
  { label: 'Other', positions: [] },
];

interface PositionBarsProps {
  contracts: PlayerContract[];
  nameToPosition: Map<string, string>;
}

export function PositionBars({ contracts, nameToPosition }: PositionBarsProps) {
  // Assign each contract to a position group
  const groupTotals = POSITION_GROUPS.map((group) => {
    const posSet = new Set(group.positions.map((p) => p.toUpperCase()));
    let total = 0;

    for (const c of contracts) {
      const pos = nameToPosition.get(normalizePlayerName(c.player));
      if (!pos) {
        // Unmatched players go to "Other"
        if (group.label === 'Other') total += c.capNumber;
        continue;
      }
      if (posSet.has(pos.toUpperCase())) {
        total += c.capNumber;
      }
    }

    return { ...group, total };
  });

  // Filter out empty groups and find max for bar scaling
  const nonEmpty = groupTotals.filter((g) => g.total > 0);
  const max = Math.max(...nonEmpty.map((g) => g.total), 1);

  if (nonEmpty.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium">
          Spending by Position
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {nonEmpty.map((group) => (
            <div key={group.label}>
              <div className="mb-1 flex items-baseline justify-between text-sm">
                <span className="font-medium">{group.label}</span>
                <span className="font-mono text-xs text-muted-foreground">
                  {fmtDollar(group.total)}
                </span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${(group.total / max) * 100}%`,
                    backgroundColor: group.positions[0]
                      ? getPositionColor(group.positions[0])
                      : 'var(--muted-foreground)',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
