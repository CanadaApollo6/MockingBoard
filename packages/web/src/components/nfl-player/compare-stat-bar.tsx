interface CompareStatBarProps {
  label: string;
  value1: number;
  value2: number;
  displayValue1: string;
  displayValue2: string;
  color1: string;
  color2: string;
  /** If true, lower is better (e.g., interceptions) */
  lowerIsBetter?: boolean;
}

export function CompareStatBar({
  label,
  value1,
  value2,
  displayValue1,
  displayValue2,
  color1,
  color2,
  lowerIsBetter = false,
}: CompareStatBarProps) {
  const max = Math.max(value1, value2) || 1;
  const pct1 = (value1 / max) * 100;
  const pct2 = (value2 / max) * 100;

  const p1Wins = lowerIsBetter ? value1 < value2 : value1 > value2;
  const p2Wins = lowerIsBetter ? value2 < value1 : value2 > value1;
  const isTied = value1 === value2;

  return (
    <div className="group">
      {/* Stat label */}
      <p className="mb-1.5 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>

      <div className="flex items-center gap-3">
        {/* Player 1 value */}
        <span
          className={`w-20 shrink-0 text-right font-mono text-sm font-semibold ${
            p1Wins && !isTied ? 'text-mb-accent' : 'text-foreground'
          }`}
        >
          {displayValue1}
        </span>

        {/* Tug-of-war bars */}
        <div className="flex flex-1 items-center gap-0.5">
          {/* Player 1 bar (grows right-to-left) */}
          <div className="flex h-7 flex-1 justify-end overflow-hidden rounded-l-md bg-muted/30">
            <div
              className="h-full rounded-l-md transition-all duration-500 ease-out"
              style={{
                width: `${pct1}%`,
                backgroundColor: color1,
                opacity: p1Wins || isTied ? 0.85 : 0.4,
                boxShadow: p1Wins && !isTied ? `0 0 12px ${color1}40` : 'none',
              }}
            />
          </div>

          {/* Center divider */}
          <div className="h-9 w-px shrink-0 bg-border" />

          {/* Player 2 bar (grows left-to-right) */}
          <div className="flex h-7 flex-1 overflow-hidden rounded-r-md bg-muted/30">
            <div
              className="h-full rounded-r-md transition-all duration-500 ease-out"
              style={{
                width: `${pct2}%`,
                backgroundColor: color2,
                opacity: p2Wins || isTied ? 0.85 : 0.4,
                boxShadow: p2Wins && !isTied ? `0 0 12px ${color2}40` : 'none',
              }}
            />
          </div>
        </div>

        {/* Player 2 value */}
        <span
          className={`w-20 shrink-0 font-mono text-sm font-semibold ${
            p2Wins && !isTied ? 'text-mb-accent' : 'text-foreground'
          }`}
        >
          {displayValue2}
        </span>
      </div>
    </div>
  );
}
