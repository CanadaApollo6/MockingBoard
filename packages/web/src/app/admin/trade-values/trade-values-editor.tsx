'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { getErrorMessage } from '@/lib/validate';

const PICKS_PER_ROUND = 32;
const ROUNDS = 8;

interface TradeValuesEditorProps {
  initialValues: number[];
  initialPremium: number;
}

export function TradeValuesEditor({
  initialValues,
  initialPremium,
}: TradeValuesEditorProps) {
  const [values, setValues] = useState<number[]>(
    initialValues.length > 0 ? initialValues : Array(256).fill(0),
  );
  const [premium, setPremium] = useState(initialPremium);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const roundGroups = useMemo(() => {
    const groups: {
      round: number;
      picks: { overall: number; value: number }[];
    }[] = [];
    for (let r = 0; r < ROUNDS; r++) {
      const picks = [];
      for (let p = 0; p < PICKS_PER_ROUND; p++) {
        const idx = r * PICKS_PER_ROUND + p;
        picks.push({ overall: idx + 1, value: values[idx] ?? 0 });
      }
      groups.push({ round: r + 1, picks });
    }
    return groups;
  }, [values]);

  const handleValueChange = (index: number, val: number) => {
    setValues((prev) => {
      const next = [...prev];
      next[index] = val;
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/trade-values', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ values, round1Premium: premium }),
      });
      if (!res.ok) throw new Error('Save failed');
      setMessage({ type: 'success', text: 'Trade values saved.' });
    } catch (err) {
      setMessage({
        type: 'error',
        text: getErrorMessage(err, 'Save failed'),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setValues(Array(256).fill(0));
    setPremium(45);
    setMessage({
      type: 'success',
      text: 'Reset to empty. Save to clear overrides and use built-in defaults.',
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Round 1 Premium:</label>
          <Input
            type="number"
            value={premium}
            onChange={(e) => setPremium(parseInt(e.target.value) || 0)}
            className="w-20"
          />
        </div>
        <Button onClick={handleSave} disabled={saving} size="sm">
          {saving ? 'Saving...' : 'Save All'}
        </Button>
        <Button variant="outline" size="sm" onClick={handleReset}>
          Reset to Defaults
        </Button>
      </div>

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

      <p className="text-xs text-muted-foreground">
        Override the Rich Hill trade value chart. Set all values to 0 and save
        to clear overrides and use the built-in defaults.
      </p>

      {roundGroups.map((group) => (
        <Card key={group.round}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Round {group.round}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
              {group.picks.map((pick) => (
                <div key={pick.overall} className="text-center">
                  <span className="block font-mono text-[10px] text-muted-foreground">
                    #{pick.overall}
                  </span>
                  <Input
                    type="number"
                    value={pick.value}
                    onChange={(e) =>
                      handleValueChange(
                        pick.overall - 1,
                        parseInt(e.target.value) || 0,
                      )
                    }
                    className="w-full text-center font-mono text-xs"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
