import React from 'react';
import type { BrandRow, SeriesRow, StyleRow } from '@/frontend/domain/entities/catalog';
import { cn } from '@/frontend/shared/utils/cn';
import { LISTING_FIELD, LISTING_LABEL, LISTING_SECTION } from '@/frontend/presentation/components/listing/listingFormStyles';

type Props = {
  brand: string;
  series: string;
  itemName: string;
  brandOptions: BrandRow[];
  seriesOptions: SeriesRow[];
  styleOptions: StyleRow[];
  onBrandChange: (name: string, slug: string) => void;
  onSeriesChange: (name: string, slug: string) => void;
  onItemNameChange: (name: string) => void;
  title?: string;
  onTitleChange?: (value: string) => void;
  titlePlaceholder?: string;
};

export default function CatalogFieldsSection({
  brand,
  series,
  itemName,
  brandOptions,
  seriesOptions,
  styleOptions,
  onBrandChange,
  onSeriesChange,
  onItemNameChange,
  title,
  onTitleChange,
  titlePlaceholder = '例如：換坑出清 - Labubu 稀有款',
}: Props) {
  return (
    <section className="space-y-5 rounded-3xl border-2 border-black bg-neutral-50 p-5">
      <p className={LISTING_SECTION}>商品資訊</p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <label className={LISTING_LABEL} htmlFor="listing-brand">
            品牌
          </label>
          <div className="relative">
            <select
              id="listing-brand"
              value={brand}
              onChange={(e) => {
                const nextName = e.target.value;
                const selected = brandOptions.find((b) => b.name === nextName);
                onBrandChange(nextName, selected?.slug ?? nextName.toLowerCase().replace(/\s+/g, '-'));
              }}
              className={cn(LISTING_FIELD, 'cursor-pointer appearance-none pr-10')}
            >
              {brandOptions.map((b) => (
                <option key={b.slug ?? b.name} value={b.name}>
                  {b.name}
                </option>
              ))}
            </select>
            <span className="material-symbols-outlined pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-black/60">
              expand_more
            </span>
          </div>
        </div>
        <div className="space-y-1.5">
          <label className={LISTING_LABEL} htmlFor="listing-series">
            系列
          </label>
          <div className="relative">
            <select
              id="listing-series"
              value={series}
              onChange={(e) => {
                const nextName = e.target.value;
                const selected = seriesOptions.find((s) => s.name === nextName);
                onSeriesChange(nextName, selected?.slug ?? '');
                onItemNameChange('');
              }}
              className={cn(LISTING_FIELD, 'cursor-pointer appearance-none pr-10')}
            >
              {seriesOptions.length > 0 ? (
                seriesOptions.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name}
                  </option>
                ))
              ) : (
                <option value="">（此品牌尚無系列）</option>
              )}
            </select>
            <span className="material-symbols-outlined pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-black/60">
              expand_more
            </span>
          </div>
        </div>
      </div>
      {onTitleChange ? (
        <div className="space-y-1.5">
          <label className={LISTING_LABEL} htmlFor="listing-title">
            貼文標題
          </label>
          <input
            id="listing-title"
            value={title ?? ''}
            onChange={(e) => onTitleChange(e.target.value)}
            className={LISTING_FIELD}
            placeholder={titlePlaceholder}
            type="text"
          />
        </div>
      ) : null}
      <div className="space-y-1.5">
        <label className={LISTING_LABEL} htmlFor="listing-item-name">
          子系列 / 款式名稱
        </label>
        <div className="relative">
          <select
            id="listing-item-name"
            value={itemName}
            onChange={(e) => onItemNameChange(e.target.value)}
            className={cn(LISTING_FIELD, 'cursor-pointer appearance-none pr-10')}
          >
            <option value="">請選擇款式（選填）</option>
            {styleOptions.map((style) => (
              <option key={style.id} value={style.name}>
                {style.name}
              </option>
            ))}
          </select>
          <span className="material-symbols-outlined pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-black/60">
            expand_more
          </span>
        </div>
      </div>
    </section>
  );
}
