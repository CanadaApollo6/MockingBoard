'use client';

import { useState, useCallback } from 'react';
import type { ScoutingReport } from '@mockingboard/shared';
import { Button } from '@/components/ui/button';
import { ReportCard } from '@/components/community/report-card';
import { ReportForm } from '@/components/community/report-form';

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
  const [reports, setReports] = useState(initialReports);
  const [showForm, setShowForm] = useState(false);

  const refreshReports = useCallback(async () => {
    try {
      const res = await fetch(`/api/reports?playerId=${playerId}`);
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports);
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
            <ReportCard key={report.id} report={report} />
          ))}
        </div>
      )}
    </div>
  );
}
