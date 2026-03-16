'use client';

import type { IncentiveClassification } from '@mockingboard/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X } from 'lucide-react';
import { DollarInput } from './dollar-input';

export interface IncentiveInput {
  description: string;
  amount: number;
  classification: IncentiveClassification;
  yearIndex: number;
}

interface IncentiveRowProps {
  incentive: IncentiveInput;
  contractYears: number;
  startYear: number;
  onChange: (incentive: IncentiveInput) => void;
  onRemove: () => void;
}

export function IncentiveRow({
  incentive,
  contractYears,
  startYear,
  onChange,
  onRemove,
}: IncentiveRowProps) {
  return (
    <div className="flex items-end gap-3 rounded-lg border p-3">
      <div className="flex-1 space-y-1">
        <label className="text-xs font-medium text-muted-foreground">
          Description
        </label>
        <Input
          placeholder="e.g. Pro Bowl selection"
          value={incentive.description}
          onChange={(e) =>
            onChange({ ...incentive, description: e.target.value })
          }
        />
      </div>
      <DollarInput
        label="Amount"
        value={incentive.amount}
        onChange={(amount) => onChange({ ...incentive, amount })}
        className="w-36"
      />
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">
          Type
        </label>
        <Select
          value={incentive.classification}
          onValueChange={(v) =>
            onChange({
              ...incentive,
              classification: v as IncentiveClassification,
            })
          }
        >
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="LTBE">LTBE</SelectItem>
            <SelectItem value="NLTBE">NLTBE</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">
          Year
        </label>
        <Select
          value={String(incentive.yearIndex)}
          onValueChange={(v) =>
            onChange({ ...incentive, yearIndex: parseInt(v, 10) })
          }
        >
          <SelectTrigger className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: contractYears }, (_, i) => (
              <SelectItem key={i} value={String(i)}>
                {startYear + i}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button variant="ghost" size="icon" onClick={onRemove} className="mb-0.5">
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
