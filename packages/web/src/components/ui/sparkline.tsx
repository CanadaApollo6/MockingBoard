interface SparklineProps {
  values: number[];
  width?: number;
  height?: number;
  className?: string;
}

export function Sparkline({
  values,
  width = 80,
  height = 24,
  className,
}: SparklineProps) {
  if (values.length === 0) return null;

  const pad = 2; // padding so the line doesn't clip at edges
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1; // avoid divide-by-zero when all values are equal

  const points = values.map((v, i) => {
    const x =
      pad +
      (values.length === 1 ? innerW / 2 : (i / (values.length - 1)) * innerW);
    const y = pad + innerH - ((v - min) / range) * innerH;
    return { x, y };
  });

  const polyline = points.map((p) => `${p.x},${p.y}`).join(' ');

  // Single value — render a dot
  if (values.length === 1) {
    return (
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className={className}
        aria-hidden
      >
        <circle cx={points[0].x} cy={points[0].y} r={2} fill="currentColor" />
      </svg>
    );
  }

  // Build polygon for gradient fill (line path + close along bottom)
  const fillPath =
    polyline +
    ` ${points[points.length - 1].x},${height} ${points[0].x},${height}`;

  const gradientId = `spark-fill-${Math.random().toString(36).slice(2, 8)}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity={0.2} />
          <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon points={fillPath} fill={`url(#${gradientId})`} />
      <polyline
        points={polyline}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
