import React from 'react';
import { cn } from '@/frontend/shared/utils/cn';
import { LISTING_LABEL, LISTING_SECTION, SHIPPING_OPTIONS } from '@/frontend/presentation/components/listing/listingFormStyles';

type Props = {
  value: string[];
  onChange: (value: string[]) => void;
};

export default function ShippingPicker({ value, onChange }: Props) {
  const toggle = (option: string) => {
    if (value.includes(option)) {
      const next = value.filter((v) => v !== option);
      if (next.length === 0) return;
      onChange(next);
      return;
    }
    onChange([...value, option]);
  };

  return (
    <section className="space-y-3">
      <p className={LISTING_SECTION}>出貨方式</p>
      <p className="text-xs text-on-surface-variant">可複選；買家下單時需從中擇一。</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {SHIPPING_OPTIONS.map((option) => {
          const checked = value.includes(option);
          return (
            <label
              key={option}
              className={cn(
                'flex cursor-pointer items-center gap-3 rounded-xl border-2 px-4 py-3 text-sm font-medium transition-colors',
                checked
                  ? 'border-black bg-secondary/15 text-on-surface'
                  : 'border-outline bg-white text-on-surface-variant'
              )}
            >
              <input
                type="checkbox"
                className="h-4 w-4 accent-black"
                checked={checked}
                onChange={() => toggle(option)}
              />
              {option}
            </label>
          );
        })}
      </div>
    </section>
  );
}
