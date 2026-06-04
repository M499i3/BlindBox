import React from 'react';
import type { BrandRow, SeriesRow } from '@/frontend/domain/entities/catalog';
import type { CatalogStyleOption } from '@/frontend/presentation/hooks/useCatalogProductPicker';
import { cn } from '@/frontend/shared/utils/cn';
import { LISTING_FIELD, LISTING_LABEL, LISTING_SECTION } from '@/frontend/presentation/components/listing/listingFormStyles';

type Props = {
  brand: string;
  ip: string;
  productLine: string;
  catalogProductId: string;
  brandOptions: BrandRow[];
  ipOptions: SeriesRow[];
  productLineOptions: string[];
  styleOptions: CatalogStyleOption[];
  productsLoading?: boolean;
  onBrandChange: (name: string, slug: string) => void;
  onIpChange: (name: string, slug: string) => void;
  onProductLineChange: (line: string) => void;
  onStyleChange: (styleId: string) => void;
  title?: string;
  onTitleChange?: (value: string) => void;
  titlePlaceholder?: string;
};

function SelectField({
  id,
  label,
  value,
  onChange,
  disabled,
  children,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className={LISTING_LABEL} htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className={cn(LISTING_FIELD, 'cursor-pointer appearance-none pr-10 disabled:opacity-50')}
        >
          {children}
        </select>
        <span className="material-symbols-outlined pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-black/60">
          expand_more
        </span>
      </div>
    </div>
  );
}

export default function CatalogFieldsSection({
  brand,
  ip,
  productLine,
  catalogProductId,
  brandOptions,
  ipOptions,
  productLineOptions,
  styleOptions,
  productsLoading,
  onBrandChange,
  onIpChange,
  onProductLineChange,
  onStyleChange,
  title,
  onTitleChange,
  titlePlaceholder = '例如：換坑出清 - Labubu 稀有款',
}: Props) {
  return (
    <section className="space-y-5 rounded-3xl border-2 border-black bg-neutral-50 p-5">
      <p className={LISTING_SECTION}>商品資訊</p>
      {productsLoading ? (
        <p className="text-xs text-on-surface-variant">載入圖鑑資料…</p>
      ) : null}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <SelectField
          id="listing-brand"
          label="品牌"
          value={brand}
          onChange={(nextName) => {
            const selected = brandOptions.find((b) => b.name === nextName);
            onBrandChange(nextName, selected?.slug ?? nextName.toLowerCase().replace(/\s+/g, '-'));
          }}
        >
          {brandOptions.map((b) => (
            <option key={b.slug ?? b.name} value={b.name}>
              {b.name}
            </option>
          ))}
        </SelectField>

        <SelectField
          id="listing-ip"
          label="IP"
          value={ip}
          disabled={!ipOptions.length}
          onChange={(nextName) => {
            const selected = ipOptions.find((s) => s.name === nextName);
            onIpChange(nextName, selected?.slug ?? '');
          }}
        >
          {ipOptions.length ? (
            ipOptions.map((s) => (
              <option key={s.id} value={s.name}>
                {s.name}
              </option>
            ))
          ) : (
            <option value="">（此品牌尚無 IP）</option>
          )}
        </SelectField>

        <SelectField
          id="listing-product-line"
          label="系列"
          value={productLine}
          disabled={!productLineOptions.length}
          onChange={onProductLineChange}
        >
          {productLineOptions.length ? (
            productLineOptions.map((line) => (
              <option key={line} value={line}>
                {line}
              </option>
            ))
          ) : (
            <option value="">（此 IP 尚無系列）</option>
          )}
        </SelectField>

        <SelectField
          id="listing-style"
          label="款式"
          value={catalogProductId}
          disabled={!styleOptions.length}
          onChange={onStyleChange}
        >
          <option value="">請選擇款式（必填）</option>
          {styleOptions.map((style) => (
            <option key={style.id} value={style.id}>
              {style.name}
            </option>
          ))}
        </SelectField>
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
    </section>
  );
}
