'use client';

import { DollarInput } from './dollar-input';

export interface YearInput {
  baseSalary: number;
  rosterBonus: number;
  optionBonus: number;
  workoutBonus: number;
}

interface YearRowProps {
  year: number;
  values: YearInput;
  onChange: (values: YearInput) => void;
}

export function YearRow({ year, values, onChange }: YearRowProps) {
  const update = (field: keyof YearInput) => (v: number) =>
    onChange({ ...values, [field]: v });

  return (
    <div className="rounded-lg border p-4">
      <p className="mb-3 text-sm font-semibold">{year}</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <DollarInput
          label="Base Salary"
          value={values.baseSalary}
          onChange={update('baseSalary')}
        />
        <DollarInput
          label="Roster Bonus"
          value={values.rosterBonus}
          onChange={update('rosterBonus')}
        />
        <DollarInput
          label="Option Bonus"
          value={values.optionBonus}
          onChange={update('optionBonus')}
        />
        <DollarInput
          label="Workout Bonus"
          value={values.workoutBonus}
          onChange={update('workoutBonus')}
        />
      </div>
    </div>
  );
}
