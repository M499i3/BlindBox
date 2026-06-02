import React from 'react';
import { cn } from '@/frontend/shared/utils/cn';
import { LISTING_FIELD, LISTING_LABEL, SHIPPING_OPTIONS } from '@/frontend/presentation/components/listing/listingFormStyles';

type Props = {
  value: string;
  onChange: (value: string) => void;
};

export default function ShippingPicker({ value, onChange }: Props) {
  return (
    <section className="space-y-1.5">
      <label className={LISTING_LABEL} htmlFor="listing-shipping">
        出貨方式
      </label>
      <select
        id="listing-shipping"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(LISTING_FIELD, 'cursor-pointer appearance-none py-4')}
      >
        {SHIPPING_OPTIONS.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </section>
  );
}
