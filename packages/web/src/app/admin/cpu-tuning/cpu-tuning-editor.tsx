'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface CpuTuningEditorProps {
  initialNeedMultipliers: number[];
  initialWildThresholds: number[];
  initialMaxNeedMults: number[];
  initialCpuPickWeights: { top: number; mid: number };
}

export function CpuTuningEditor({
  initialNeedMultipliers,
  initialWildThresholds,
  initialMaxNeedMults,
  initialCpuPickWeights,
}: CpuTuningEditorProps) {
  const [needMults, setNeedMults] = useState(initialNeedMultipliers);
  const [wildThresholds, setWildThresholds] = useState(initialWildThresholds);
  const [maxNeedMults, setMaxNeedMults] = useState(initialMaxNeedMults);
  const [weights, setWeights] = useState(initialCpuPickWeights);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const body: Record<string, unknown> = {
        cpuPickWeights: weights,
      };
      if (needMults.length > 0) body.needMultipliers = needMults;
      if (wildThresholds.length > 0) body.wildThresholds = wildThresholds;
      if (maxNeedMults.length > 0) body.maxNeedMults = maxNeedMults;

      const res = await fetch('/api/admin/cpu-tuning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Save failed');
      setMessage({ type: 'success', text: 'CPU config saved.' });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Save failed',
      });
    } finally {
      setSaving(false);
    }
  };

  const updateArray = (
    setter: (v: number[]) => void,
    arr: number[],
    index: number,
    value: number,
  ) => {
    const next = [...arr];
    next[index] = value;
    setter(next);
  };

  return (
    <div className="space-y-6">
      {message && (
        <div
          className={`rounded-md px-4 py-2 text-sm ${
            message.type === 'success'
              ? 'bg-green-500/10 text-green-500'
              : 'bg-destructive/10 text-destructive'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Pick Weights */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">
            CPU Pick Weights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-xs text-muted-foreground">
            Controls how much the CPU weights consensus rank vs. randomness. TOP
            applies to high picks, MID to mid-round picks.
          </p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">TOP:</label>
              <Input
                type="number"
                step="0.01"
                value={weights.top}
                onChange={(e) =>
                  setWeights((w) => ({
                    ...w,
                    top: parseFloat(e.target.value) || 0,
                  }))
                }
                className="w-20"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">MID:</label>
              <Input
                type="number"
                step="0.01"
                value={weights.mid}
                onChange={(e) =>
                  setWeights((w) => ({
                    ...w,
                    mid: parseFloat(e.target.value) || 0,
                  }))
                }
                className="w-20"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Need Multipliers */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">
            Need Multipliers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-xs text-muted-foreground">
            Applied to consensus rank based on team need priority. Index 0 is
            the #1 need (biggest boost). Lower value = stronger pull toward
            need. Default: [0.85, 0.9, 0.93, 0.96, 0.98]
          </p>
          <div className="flex flex-wrap gap-3">
            {needMults.map((v, i) => (
              <div key={i} className="text-center">
                <span className="block text-[10px] text-muted-foreground">
                  Need #{i + 1}
                </span>
                <Input
                  type="number"
                  step="0.01"
                  value={v}
                  onChange={(e) =>
                    updateArray(
                      setNeedMults,
                      needMults,
                      i,
                      parseFloat(e.target.value) || 0,
                    )
                  }
                  className="w-16 text-center font-mono text-xs"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Wild Thresholds */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">
            Wild Thresholds (Randomness)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-xs text-muted-foreground">
            Cumulative probability thresholds for top-5 candidate selection at
            maximum randomness. Default: [0.4, 0.65, 0.83, 0.93, 1.0]. Leave
            empty to use defaults.
          </p>
          <div className="flex flex-wrap gap-3">
            {(wildThresholds.length > 0
              ? wildThresholds
              : [0.4, 0.65, 0.83, 0.93, 1.0]
            ).map((v, i) => (
              <div key={i} className="text-center">
                <span className="block text-[10px] text-muted-foreground">
                  Slot #{i + 1}
                </span>
                <Input
                  type="number"
                  step="0.01"
                  value={v}
                  onChange={(e) => {
                    const arr =
                      wildThresholds.length > 0
                        ? wildThresholds
                        : [0.4, 0.65, 0.83, 0.93, 1.0];
                    updateArray(
                      setWildThresholds,
                      arr,
                      i,
                      parseFloat(e.target.value) || 0,
                    );
                  }}
                  className="w-16 text-center font-mono text-xs"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Max Need Mults */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">
            Max Need Multipliers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-xs text-muted-foreground">
            Maximum effect of needs when needsWeight=1.0. Default: [0.7, 0.8,
            0.86, 0.92, 0.96]. Leave empty to use defaults.
          </p>
          <div className="flex flex-wrap gap-3">
            {(maxNeedMults.length > 0
              ? maxNeedMults
              : [0.7, 0.8, 0.86, 0.92, 0.96]
            ).map((v, i) => (
              <div key={i} className="text-center">
                <span className="block text-[10px] text-muted-foreground">
                  Need #{i + 1}
                </span>
                <Input
                  type="number"
                  step="0.01"
                  value={v}
                  onChange={(e) => {
                    const arr =
                      maxNeedMults.length > 0
                        ? maxNeedMults
                        : [0.7, 0.8, 0.86, 0.92, 0.96];
                    updateArray(
                      setMaxNeedMults,
                      arr,
                      i,
                      parseFloat(e.target.value) || 0,
                    );
                  }}
                  className="w-16 text-center font-mono text-xs"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="sm">
          {saving ? 'Saving...' : 'Save CPU Config'}
        </Button>
      </div>
    </div>
  );
}
