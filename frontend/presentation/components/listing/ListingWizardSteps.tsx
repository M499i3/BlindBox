import React from 'react';
import { cn } from '@/frontend/shared/utils/cn';

type Props = {
  current: number;
  total: number;
  labels?: string[];
};

export default function ListingWizardSteps({ current, total, labels }: Props) {
  return (
    <div className="flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-wider">
      {Array.from({ length: total }, (_, i) => i + 1).map((n) => (
        <span
          key={n}
          className={cn(
            'rounded-full px-3 py-1',
            current === n ? 'bg-black text-white' : 'bg-neutral-100 text-black/50'
          )}
        >
          {labels?.[n - 1] ?? `步驟 ${n}`}
        </span>
      ))}
    </div>
  );
}
