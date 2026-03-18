import { Badge } from '@/components/ui/badge';
import { getAccuracyBadge } from '@/lib/scoring';

interface AccuracyBadgeProps {
  score: number;
  showScore?: boolean;
}

export function AccuracyBadge({ score, showScore = true }: AccuracyBadgeProps) {
  const badge = getAccuracyBadge(score);
  if (!badge) return null;

  return (
    <Badge variant="outline" className={`gap-1 ${badge.color}`}>
      {badge.label}
      {showScore && <span className="font-mono">{score}%</span>}
    </Badge>
  );
}
