import { redirect } from 'next/navigation';
import Link from 'next/link';
import { NotebookPen } from 'lucide-react';
import { Routes } from '@/routes';
import { getSessionUser } from '@/lib/firebase/auth-session';
import { getUserReports, getPlayerMap } from '@/lib/firebase/data';
import { getCachedSeasonConfig } from '@/lib/cache';
import { GradeBadge } from '@/components/grade/grade-badge';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tape Log',
  description: 'Your scouting diary — every prospect you graded.',
};

function groupByDate(
  reports: { createdAt: { seconds: number } }[],
): { label: string; items: typeof reports }[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86_400_000);

  const groups = new Map<string, typeof reports>();

  for (const report of reports) {
    const date = new Date(report.createdAt.seconds * 1000);
    const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    let label: string;
    if (day.getTime() === today.getTime()) {
      label = 'Today';
    } else if (day.getTime() === yesterday.getTime()) {
      label = 'Yesterday';
    } else {
      label = day.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
      });
    }

    const group = groups.get(label);
    if (group) {
      group.push(report);
    } else {
      groups.set(label, [report]);
    }
  }

  return Array.from(groups, ([label, items]) => ({ label, items }));
}

export default async function TapeLogPage() {
  const session = await getSessionUser();
  if (!session) redirect(Routes.AUTH_SIGNIN);

  const { draftYear } = await getCachedSeasonConfig();
  const [reports, playerMap] = await Promise.all([
    getUserReports(session.uid),
    getPlayerMap(draftYear),
  ]);

  const dateGroups = groupByDate(reports);

  return (
    <main className="mx-auto max-w-screen-md px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <NotebookPen className="h-6 w-6 text-mb-accent" />
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold uppercase tracking-tight">
              Tape Log
            </h1>
            <p className="text-sm text-muted-foreground">
              {reports.length} {reports.length === 1 ? 'entry' : 'entries'}
            </p>
          </div>
        </div>
      </div>

      {/* Entries */}
      {reports.length === 0 ? (
        <div className="mt-16 text-center">
          <NotebookPen className="mx-auto h-10 w-10 text-muted-foreground/30" />
          <p className="mt-4 text-muted-foreground">
            Start logging tape — grade prospects from the big board.
          </p>
          <Link
            href={Routes.PROSPECTS}
            className="mt-2 inline-block text-sm text-mb-accent hover:underline"
          >
            Browse prospects
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {dateGroups.map((group) => (
            <div key={group.label}>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
                {group.label}
              </h2>
              <div className="space-y-2">
                {group.items.map((report) => {
                  const player = playerMap.get(report.playerId);
                  return (
                    <Link
                      key={report.id}
                      href={Routes.prospect(report.playerId)}
                      className="flex items-start gap-3 rounded-lg border bg-card px-4 py-3 transition-colors hover:bg-muted/30"
                    >
                      {/* Grade */}
                      <div className="shrink-0 pt-0.5">
                        {report.grade != null ? (
                          <GradeBadge
                            grade={report.grade}
                            system={report.gradeSystem ?? 'tier'}
                          />
                        ) : (
                          <span className="flex h-7 w-7 items-center justify-center rounded bg-muted text-[10px] text-muted-foreground">
                            —
                          </span>
                        )}
                      </div>

                      {/* Details */}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">
                          {player?.name ?? 'Unknown Prospect'}
                          {player && (
                            <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                              {player.position} · {player.school}
                            </span>
                          )}
                        </p>
                        {report.note && (
                          <p className="mt-0.5 text-sm text-muted-foreground italic">
                            &ldquo;{report.note}&rdquo;
                          </p>
                        )}
                        <span className="text-[10px] text-muted-foreground/60">
                          {new Date(
                            report.createdAt.seconds * 1000,
                          ).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
