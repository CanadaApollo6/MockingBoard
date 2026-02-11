'use client';

import { useState, useEffect } from 'react';
import type { GradeSystem, ScoutingReport } from '@mockingboard/shared';
import { useAuth } from '@/components/auth/auth-provider';
import { GradePicker } from '@/components/grade/grade-picker';
import { GradeBadge } from '@/components/grade/grade-badge';

interface QuickGradeProps {
  playerId: string;
  year: number;
  initialReports: ScoutingReport[];
}

export function QuickGrade({
  playerId,
  year,
  initialReports,
}: QuickGradeProps) {
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [system, setSystem] = useState<GradeSystem>('tier');

  const myReport = user
    ? initialReports.find((r) => r.authorId === user.uid)
    : null;
  const [grade, setGrade] = useState<number | undefined>(myReport?.grade);

  useEffect(() => {
    if (myReport?.gradeSystem) setSystem(myReport.gradeSystem);
  }, [myReport?.gradeSystem]);

  if (!user) return null;

  async function handleGradeChange(value: number | undefined) {
    setGrade(value);
    if (value === undefined) return;

    setSaving(true);
    try {
      await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId,
          year,
          grade: value,
          gradeSystem: system,
        }),
      });
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  }

  // Already has a grade — show badge
  if (myReport?.grade != null && !expanded) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Your grade:</span>
        <button onClick={() => setExpanded(true)}>
          <GradeBadge
            grade={myReport.grade}
            system={myReport.gradeSystem ?? 'tier'}
          />
        </button>
      </div>
    );
  }

  // No grade yet — show CTA or expanded picker
  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="text-xs text-mb-accent hover:underline"
      >
        Quick Grade
      </button>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border bg-card p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium">
          {saving ? 'Saving...' : 'Quick Grade'}
        </span>
        <button
          onClick={() => setExpanded(false)}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Close
        </button>
      </div>
      <GradePicker
        value={grade}
        system={system}
        onChangeValue={handleGradeChange}
        onChangeSystem={setSystem}
      />
    </div>
  );
}
