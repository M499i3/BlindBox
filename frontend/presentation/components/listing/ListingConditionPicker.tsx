import React from 'react';
import { cn } from '@/frontend/shared/utils/cn';
import { LISTING_SECTION } from '@/frontend/presentation/components/listing/listingFormStyles';

const CONDITIONS = ['全新未拆', '已拆盒', '展示過'] as const;

type Props = {
  value: string;
  onChange: (value: string) => void;
};

export default function ListingConditionPicker({ value, onChange }: Props) {
  return (
    <section className="space-y-3">
      <p className={LISTING_SECTION}>商品狀態</p>
      <div className="flex gap-1 rounded-2xl border-2 border-black bg-white p-1">
        {CONDITIONS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            className={cn(
              'flex-1 rounded-xl py-3 text-xs font-bold transition-colors',
              value === c ? 'bg-black text-white' : 'text-black hover:bg-neutral-100'
            )}
          >
            {c}
          </button>
        ))}
      </div>
    </section>
  );
}
