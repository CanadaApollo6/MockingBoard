'use client';

import { useState } from 'react';
import type { GradeSystem } from '@mockingboard/shared';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GradePicker } from '@/components/grade-picker';
import { TipTapEditor } from '@/components/tiptap-editor';

interface ReportFormProps {
  playerId: string;
  playerName: string;
  year: number;
  initial?: {
    grade?: number;
    gradeSystem?: GradeSystem;
    comparison?: string;
    strengths?: string[];
    weaknesses?: string[];
    content?: Record<string, unknown>;
  };
  onSubmit: () => void;
  onCancel: () => void;
}

export function ReportForm({
  playerId,
  playerName,
  year,
  initial,
  onSubmit,
  onCancel,
}: ReportFormProps) {
  const [grade, setGrade] = useState<number | undefined>(initial?.grade);
  const [gradeSystem, setGradeSystem] = useState<GradeSystem>(
    initial?.gradeSystem ?? 'tier',
  );
  const [comparison, setComparison] = useState(initial?.comparison ?? '');
  const [strengthInput, setStrengthInput] = useState('');
  const [strengths, setStrengths] = useState<string[]>(
    initial?.strengths ?? [],
  );
  const [weaknessInput, setWeaknessInput] = useState('');
  const [weaknesses, setWeaknesses] = useState<string[]>(
    initial?.weaknesses ?? [],
  );
  const [content, setContent] = useState<Record<string, unknown> | undefined>(
    initial?.content,
  );
  const [contentText, setContentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function addTag(
    value: string,
    list: string[],
    setList: (v: string[]) => void,
    setInput: (v: string) => void,
  ) {
    const trimmed = value.trim();
    if (!trimmed || list.includes(trimmed)) return;
    setList([...list, trimmed]);
    setInput('');
  }

  function removeTag(
    tag: string,
    list: string[],
    setList: (v: string[]) => void,
  ) {
    setList(list.filter((t) => t !== tag));
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError('');

    try {
      const body: Record<string, unknown> = { playerId, year };
      if (grade != null) {
        body.grade = grade;
        body.gradeSystem = gradeSystem;
      }
      if (comparison.trim()) body.comparison = comparison.trim();
      if (strengths.length > 0) body.strengths = strengths;
      if (weaknesses.length > 0) body.weaknesses = weaknesses;
      if (content) body.content = content;
      if (contentText) body.contentText = contentText;

      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to submit report');
      }

      onSubmit();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold">Scouting Report: {playerName}</h3>
        <Button variant="ghost" size="xs" onClick={onCancel}>
          Cancel
        </Button>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          Grade <span className="font-normal">(optional)</span>
        </label>
        <GradePicker
          value={grade}
          system={gradeSystem}
          onChangeValue={setGrade}
          onChangeSystem={setGradeSystem}
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          NFL Comp
        </label>
        <input
          type="text"
          value={comparison}
          onChange={(e) => setComparison(e.target.value)}
          placeholder="e.g. Patrick Mahomes"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Strengths tags */}
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          Strengths
        </label>
        <div className="flex flex-wrap gap-1.5 mb-1.5">
          {strengths.map((s) => (
            <Badge
              key={s}
              className="cursor-pointer border-mb-success/30 bg-mb-success/10 text-xs text-mb-success"
              onClick={() => removeTag(s, strengths, setStrengths)}
            >
              {s} &times;
            </Badge>
          ))}
        </div>
        <input
          type="text"
          value={strengthInput}
          onChange={(e) => setStrengthInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addTag(strengthInput, strengths, setStrengths, setStrengthInput);
            }
          }}
          placeholder="Type a strength and press Enter"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Weaknesses tags */}
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          Weaknesses
        </label>
        <div className="flex flex-wrap gap-1.5 mb-1.5">
          {weaknesses.map((w) => (
            <Badge
              key={w}
              className="cursor-pointer border-mb-danger/30 bg-mb-danger/10 text-xs text-mb-danger"
              onClick={() => removeTag(w, weaknesses, setWeaknesses)}
            >
              {w} &times;
            </Badge>
          ))}
        </div>
        <input
          type="text"
          value={weaknessInput}
          onChange={(e) => setWeaknessInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addTag(
                weaknessInput,
                weaknesses,
                setWeaknesses,
                setWeaknessInput,
              );
            }
          }}
          placeholder="Type a weakness and press Enter"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Long-form content */}
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          Detailed Analysis (optional)
        </label>
        <TipTapEditor
          content={content}
          onChange={(json, text) => {
            setContent(json);
            setContentText(text);
          }}
          placeholder="Write a detailed scouting report..."
        />
      </div>

      {error && <p className="text-sm text-mb-danger">{error}</p>}

      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button size="sm" onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'Submitting...' : 'Submit Report'}
        </Button>
      </div>
    </div>
  );
}
