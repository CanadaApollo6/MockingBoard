'use client';

import { useState, useCallback, useEffect } from 'react';
import type { ScoutingReport } from '@mockingboard/shared';
import { Button } from '@/components/ui/button';
import { ReportCard } from '@/components/community/report-card';
import { ReportForm } from '@/components/community/report-form';
import { useAuth } from '@/components/auth/auth-provider';

function sortByLikes(reports: ScoutingReport[]): ScoutingReport[] {
  return [...reports].sort(
    (a, b) => (b.likeCount ?? 0) - (a.likeCount ?? 0),
  );
}

interface CommunityReportsProps {
  playerId: string;
  playerName: string;
  year: number;
  initialReports: ScoutingReport[];
}

export function CommunityReports({
  playerId,
  playerName,
  year,
  initialReports,
}: CommunityReportsProps) {
  const { user } = useAuth();
  const [reports, setReports] = useState(sortByLikes(initialReports));
  const [showForm, setShowForm] = useState(false);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());

  // Fetch current user's like status for all displayed reports
  useEffect(() => {
    if (!user || reports.length === 0) return;

    const ids = reports.map((r) => r.id);
    fetch(`/api/reports/likes/status?ids=${ids.join(',')}`)
      .then((res) => (res.ok ? res.json() : { likedIds: [] }))
      .then((data: { likedIds: string[] }) =>
        setLikedIds(new Set(data.likedIds)),
      )
      .catch(() => {});
  }, [user, reports]);

  const refreshReports = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/reports?playerId=${playerId}&sort=likes`,
      );
      if (res.ok) {
        const data = await res.json();
        setReports(sortByLikes(data.reports));
      }
    } catch {
      /* ignore */
    }
  }, [playerId]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Community Reports</h2>
        {!showForm && (
          <Button size="sm" onClick={() => setShowForm(true)}>
            Write a Report
          </Button>
        )}
      </div>

      {showForm && (
        <ReportForm
          playerId={playerId}
          playerName={playerName}
          year={year}
          onSubmit={() => {
            setShowForm(false);
            refreshReports();
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {reports.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No community reports yet. Be the first to scout this player.
        </p>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              isLiked={likedIds.has(report.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
