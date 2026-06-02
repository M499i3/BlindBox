import React from 'react';
import type { StyleRow } from '@/frontend/domain/entities/catalog';
import { cn } from '@/frontend/shared/utils/cn';
import { LISTING_FIELD, LISTING_SECTION } from '@/frontend/presentation/components/listing/listingFormStyles';

type Props = {
  query: string;
  onQueryChange: (value: string) => void;
  styles: StyleRow[];
  onSelect: (style: StyleRow) => void;
};

export default function CatalogPickerSection({ query, onQueryChange, styles, onSelect }: Props) {
  return (
    <section className="space-y-3">
      <p className={LISTING_SECTION}>從圖鑑帶入</p>
      <div className="relative">
        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-black">
          search
        </span>
        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          className={cn(LISTING_FIELD, 'rounded-full py-4 pl-12 pr-6')}
          placeholder="搜尋官方圖鑑自動帶入資料…"
          type="search"
        />
      </div>
      {styles.length > 0 ? (
        <div className="grid grid-cols-4 gap-2">
          {styles.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelect(p)}
              className="aspect-square overflow-hidden rounded-xl border-2 border-black bg-white active:scale-95"
            >
              <img
                src={p.image}
                alt=""
                className="h-full w-full object-cover"
                referrerPolicy="no-referrer"
              />
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
