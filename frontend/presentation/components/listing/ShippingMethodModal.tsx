import React, { useEffect, useMemo, useState } from 'react';
import { cn } from '@/frontend/shared/utils/cn';
import { LISTING_FIELD } from '@/frontend/presentation/components/listing/listingFormStyles';
import { coerceShippingMethods } from '@/frontend/shared/utils/listingShipping';

type Props = {
  open: boolean;
  title?: string;
  options: string[];
  onConfirm: (shipping: string) => void;
  onCancel: () => void;
};

export default function ShippingMethodModal({
  open,
  title = '選擇出貨方式',
  options,
  onConfirm,
  onCancel,
}: Props) {
  const safeOptions = useMemo(() => coerceShippingMethods(options), [options]);
  const [selected, setSelected] = useState(safeOptions[0] ?? '');

  useEffect(() => {
    if (safeOptions.length) setSelected(safeOptions[0]);
  }, [safeOptions]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/45 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-2xl border-2 border-outline bg-white p-5 shadow-[6px_6px_0_#111]"
      >
        <h2 className="text-lg font-extrabold text-on-surface">{title}</h2>
        <p className="mt-1 text-sm text-on-surface-variant">賣家提供以下出貨方式，請選擇一項。</p>
        <div className="relative mt-4">
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className={cn(LISTING_FIELD, 'cursor-pointer appearance-none pr-10')}
          >
            {safeOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          <span className="material-symbols-outlined pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-black/60">
            expand_more
          </span>
        </div>
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-full border-2 border-outline py-3 text-sm font-bold"
          >
            取消
          </button>
          <button
            type="button"
            onClick={() => onConfirm(selected)}
            className="flex-1 rounded-full premium-gradient py-3 text-sm font-bold text-white"
          >
            確認
          </button>
        </div>
      </div>
    </div>
  );
}
