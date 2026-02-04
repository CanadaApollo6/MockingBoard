import { useMemo } from 'react';
import type { ScoutingReport } from '@mockingboard/shared';

interface WordCloudProps {
  reports: ScoutingReport[];
  max?: number;
}

const MIN_REM = 0.75;
const MAX_REM = 1.5;

function buildFrequencyMap(tags: string[]): Map<string, number> {
  const freq = new Map<string, number>();
  for (const tag of tags) {
    const normalized = tag.trim().toLowerCase();
    if (normalized) freq.set(normalized, (freq.get(normalized) ?? 0) + 1);
  }
  return freq;
}

function topN(freq: Map<string, number>, n: number) {
  const sorted = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
  const maxCount = sorted[0]?.[1] ?? 1;
  return sorted.map(([word, count]) => ({
    word,
    count,
    size: MIN_REM + (count / maxCount) * (MAX_REM - MIN_REM),
  }));
}

function CloudSection({
  label,
  words,
  colorClass,
}: {
  label: string;
  words: { word: string; count: number; size: number }[];
  colorClass: string;
}) {
  if (words.length === 0) return null;

  return (
    <div>
      <h3 className="mb-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
        {label}
      </h3>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1.5">
        {words.map(({ word, size }) => (
          <span
            key={word}
            className={`font-medium ${colorClass}`}
            style={{ fontSize: `${size}rem` }}
          >
            {word}
          </span>
        ))}
      </div>
    </div>
  );
}

export function WordCloud({ reports, max = 8 }: WordCloudProps) {
  const { strengths, weaknesses } = useMemo(() => {
    const allStrengths: string[] = [];
    const allWeaknesses: string[] = [];

    for (const r of reports) {
      if (r.strengths) allStrengths.push(...r.strengths);
      if (r.weaknesses) allWeaknesses.push(...r.weaknesses);
    }

    return {
      strengths: topN(buildFrequencyMap(allStrengths), max),
      weaknesses: topN(buildFrequencyMap(allWeaknesses), max),
    };
  }, [reports, max]);

  if (strengths.length === 0 && weaknesses.length === 0) return null;

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <CloudSection
        label="Strengths"
        words={strengths}
        colorClass="text-mb-success"
      />
      <CloudSection
        label="Weaknesses"
        words={weaknesses}
        colorClass="text-mb-danger"
      />
    </div>
  );
}
