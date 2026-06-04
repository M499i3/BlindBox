import React, { useEffect, useRef } from 'react';
import CatalogFieldsSection from '@/frontend/presentation/components/listing/CatalogFieldsSection';
import { LISTING_SECTION } from '@/frontend/presentation/components/listing/listingFormStyles';
import {
  useCatalogProductPicker,
  type CatalogProductPickerValue,
} from '@/frontend/presentation/hooks/useCatalogProductPicker';

export type IdealSwapTarget = CatalogProductPickerValue;

export type IdealSwapEntry = IdealSwapTarget & { id: string };

type EntryCardProps = {
  index: number;
  initial: IdealSwapEntry;
  reservedIds: Set<string>;
  canRemove: boolean;
  onChange: (value: IdealSwapTarget) => void;
  onRemove: () => void;
};

function IdealSwapEntryCard({
  index,
  initial,
  reservedIds,
  canRemove,
  onChange,
  onRemove,
}: EntryCardProps) {
  const picker = useCatalogProductPicker({ initial });
  const lastEmitted = useRef('');
  const styleOptions = picker.styleOptions.filter(
    (style) => !reservedIds.has(style.id) || style.id === picker.catalogProductId
  );

  useEffect(() => {
    const payload = JSON.stringify(picker.value);
    if (payload === lastEmitted.current) return;
    lastEmitted.current = payload;
    onChange(picker.value);
  }, [onChange, picker.value]);

  const handleStyleChange = (styleId: string) => {
    if (!styleId) {
      picker.setCatalogProductId('');
      picker.setItemName('');
      return;
    }
    if (reservedIds.has(styleId)) {
      alert('此款式已在理想交換清單中，或與換出商品相同，請選擇其他款式');
      return;
    }
    picker.applyCatalogStyle(styleId);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
          理想交換 #{index + 1}
        </p>
        {canRemove ? (
          <button
            type="button"
            onClick={onRemove}
            className="text-xs font-bold text-primary underline-offset-2 hover:underline"
          >
            移除
          </button>
        ) : null}
      </div>
      <CatalogFieldsSection
        brand={picker.brand}
        ip={picker.ip}
        productLine={picker.productLine}
        catalogProductId={picker.catalogProductId}
        brandOptions={picker.brandOptions}
        ipOptions={picker.ipOptions}
        productLineOptions={picker.productLineOptions}
        styleOptions={styleOptions}
        productsLoading={picker.productsLoading}
        onBrandChange={(name, slug) => {
          picker.setBrand(name);
          picker.setBrandSlug(slug);
        }}
        onIpChange={(name, slug) => {
          picker.setIp(name);
          picker.setIpSlug(slug);
        }}
        onProductLineChange={picker.setProductLine}
        onStyleChange={handleStyleChange}
      />
    </div>
  );
}

type Props = {
  offerCatalogProductId: string;
  entries: IdealSwapEntry[];
  onChange: (entries: IdealSwapEntry[]) => void;
};

function newEntry(): IdealSwapEntry {
  return {
    id: crypto.randomUUID(),
    catalogProductId: '',
    itemName: '',
    brand: '',
    brandSlug: '',
    ip: '',
    ipSlug: '',
    productLine: '',
  };
}

export function formatIdealSwapDescription(targets: IdealSwapTarget[]): string {
  const lines = targets
    .filter((t) => t.catalogProductId && t.itemName.trim())
    .map(
      (t, i) =>
        `${i + 1}. ${t.brand} · ${t.ip} · ${t.productLine} · ${t.itemName.trim()}`
    );
  if (!lines.length) return '';
  return `【理想交換】\n${lines.join('\n')}`;
}

export function hasValidIdealSwapTargets(targets: IdealSwapTarget[]): boolean {
  return targets.some((t) => t.catalogProductId && t.itemName.trim());
}

export function createInitialIdealSwapEntries(): IdealSwapEntry[] {
  return [newEntry()];
}

export default function IdealSwapTargetsSection({
  offerCatalogProductId,
  entries,
  onChange,
}: Props) {
  const completed = entries.filter((e) => e.catalogProductId && e.itemName.trim());

  const updateEntry = (index: number, value: IdealSwapTarget) => {
    const next = entries.map((e, i) =>
      i === index ? { ...e, ...value } : e
    );
    const isLast = index === next.length - 1;
    const filled = Boolean(value.catalogProductId && value.itemName.trim());
    const hasIncomplete = next.some((e) => !e.catalogProductId);

    if (isLast && filled && !hasIncomplete) {
      onChange([...next, newEntry()]);
      return;
    }
    onChange(next);
  };

  const removeEntry = (index: number) => {
    if (entries.length <= 1) return;
    const next = entries.filter((_, i) => i !== index);
    onChange(next.length ? next : [newEntry()]);
  };

  const reservedForIndex = (index: number) => {
    const ids = new Set<string>();
    if (offerCatalogProductId) ids.add(offerCatalogProductId);
    entries.forEach((e, i) => {
      if (i !== index && e.catalogProductId) ids.add(e.catalogProductId);
    });
    return ids;
  };

  return (
    <section className="space-y-5 rounded-3xl border-2 border-black bg-neutral-50 p-5">
      <div>
        <p className={LISTING_SECTION}>理想交換</p>
        <p className="mt-1 text-xs text-on-surface-variant">
          從圖鑑選擇想換到的款式，填完一筆會自動出現下一筆；款式不可重複，且不可與換出商品相同。
          {completed.length > 0 ? ` 已選 ${completed.length} 款。` : ''}
        </p>
      </div>
      <div className="space-y-6">
        {entries.map((entry, index) => (
          <IdealSwapEntryCard
            key={entry.id}
            index={index}
            initial={entry}
            reservedIds={reservedForIndex(index)}
            canRemove={entries.length > 1 && Boolean(entry.catalogProductId)}
            onChange={(value) => updateEntry(index, value)}
            onRemove={() => removeEntry(index)}
          />
        ))}
      </div>
    </section>
  );
}
