'use client';

import { useState, useEffect } from 'react';
import type { GradeSystem, ScoutingReport } from '@mockingboard/shared';
import { useAuth } from '@/components/auth/auth-provider';
import { GradePicker } from '@/components/grade/grade-picker';
import { GradeBadge } from '@/components/grade/grade-badge';
import { MAX_NOTE_LENGTH } from '@/lib/validation';

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
  const [note, setNote] = useState(myReport?.note ?? '');

  useEffect(() => {
    if (myReport?.gradeSystem) setSystem(myReport.gradeSystem);
  }, [myReport?.gradeSystem]);

  useEffect(() => {
    if (myReport?.note !== undefined) setNote(myReport.note);
  }, [myReport?.note]);

  if (!user) return null;

  async function save(gradeValue: number | undefined, noteValue: string) {
    if (gradeValue === undefined) return;

    setSaving(true);
    try {
      await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId,
          year,
          grade: gradeValue,
          gradeSystem: system,
          note: noteValue.trim() || null,
        }),
      });
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  }

  function handleGradeChange(value: number | undefined) {
    setGrade(value);
    if (value === undefined) return;
    save(value, note);
  }

  function handleNoteSubmit() {
    save(grade, note);
  }

  // Already has a grade — show badge + note snippet
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
        {myReport.note && (
          <span className="max-w-[200px] truncate text-xs text-muted-foreground italic">
            &ldquo;{myReport.note}&rdquo;
          </span>
        )}
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
      {grade !== undefined && (
        <div className="space-y-1">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={handleNoteSubmit}
            placeholder="Quick take (optional)"
            maxLength={MAX_NOTE_LENGTH}
            rows={2}
            className="w-full resize-none rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">
              {note.length}/{MAX_NOTE_LENGTH}
            </span>
            {note.trim() !== (myReport?.note ?? '') && (
              <button
                onClick={handleNoteSubmit}
                disabled={saving}
                className="text-xs font-medium text-mb-accent hover:underline disabled:opacity-50"
              >
                Save
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
