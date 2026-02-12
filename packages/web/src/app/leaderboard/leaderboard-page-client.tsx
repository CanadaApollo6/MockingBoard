'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Trophy } from 'lucide-react';
import type { LeaderboardEntry } from '@/lib/firebase/data';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';

const MEDAL_COLORS = ['text-yellow-500', 'text-gray-400', 'text-amber-700'];

interface LeaderboardPageClientProps {
  entries: LeaderboardEntry[];
  selectedYear: number | null;
  availableYears: number[];
}

export function LeaderboardPageClient({
  entries,
  selectedYear,
  availableYears,
}: LeaderboardPageClientProps) {
  const router = useRouter();

  function handleYearChange(value: string) {
    if (value === 'all') {
      router.push('/leaderboard');
    } else {
      router.push(`/leaderboard?year=${value}`);
    }
  }

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Leaderboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Prediction accuracy rankings
          </p>
        </div>
        <Select
          value={selectedYear ? String(selectedYear) : 'all'}
          onValueChange={handleYearChange}
        >
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            {availableYears.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {entries.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center">
          <Trophy className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
          <p className="font-medium">No predictions scored yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Lock your mock drafts as predictions before the NFL Draft to compete
            on the leaderboard.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          <table className="w-full">
            <thead>
              <tr className="border-b text-left text-xs font-medium text-muted-foreground">
                <th className="px-4 py-3 w-12">#</th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3 text-right">Accuracy</th>
                {selectedYear && (
                  <th className="px-4 py-3 text-right">Drafts</th>
                )}
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, i) => (
                <tr
                  key={entry.userId}
                  className="border-b last:border-b-0 transition-colors hover:bg-muted/50"
                >
                  <td className="px-4 py-3">
                    {i < 3 ? (
                      <span className={`text-lg ${MEDAL_COLORS[i]}`}>
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}
                      </span>
                    ) : (
                      <span className="font-mono text-sm text-muted-foreground">
                        {i + 1}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {entry.slug && entry.isPublic ? (
                      <Link
                        href={`/profile/${entry.slug}`}
                        className="font-medium hover:text-primary"
                      >
                        {entry.displayName}
                      </Link>
                    ) : (
                      <span className="font-medium">{entry.displayName}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-mono font-semibold">
                      {entry.avgScore}%
                    </span>
                  </td>
                  {selectedYear && (
                    <td className="px-4 py-3 text-right text-sm text-muted-foreground">
                      {entry.draftCount}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
