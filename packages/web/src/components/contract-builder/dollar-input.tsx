'use client';

import { useCallback, useState } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface DollarInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  className?: string;
}

const formatter = new Intl.NumberFormat('en-US');

export function DollarInput({
  label,
  value,
  onChange,
  min = 0,
  max,
  className,
}: DollarInputProps) {
  const [focused, setFocused] = useState(false);
  const [raw, setRaw] = useState('');

  const handleFocus = useCallback(() => {
    setFocused(true);
    setRaw(value === 0 ? '' : String(value));
  }, [value]);

  const handleBlur = useCallback(() => {
    setFocused(false);
    const parsed = Math.max(min, parseInt(raw.replace(/\D/g, ''), 10) || 0);
    const clamped = max !== undefined ? Math.min(parsed, max) : parsed;
    onChange(clamped);
  }, [raw, min, max, onChange]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setRaw(e.target.value);
  }, []);

  return (
    <div className={cn('space-y-1', className)}>
      <label className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm text-muted-foreground">
          $
        </span>
        <Input
          type="text"
          inputMode="numeric"
          className="pl-7 font-mono"
          value={focused ? raw : formatter.format(value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onChange={handleChange}
        />
      </div>
    </div>
  );
}
