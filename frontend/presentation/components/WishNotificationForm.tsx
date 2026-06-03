import React from 'react';
import type { WishAlertSettings } from '@/frontend/domain/entities/wishAlert';
import ToggleSwitch from '@/frontend/presentation/components/ToggleSwitch';
import { cn } from '@/frontend/shared/utils/cn';

type Props = {
  value: WishAlertSettings;
  onChange: (next: WishAlertSettings) => void;
  lowestMarketHint?: number | null;
};

export default function WishNotificationForm({ value, onChange, lowestMarketHint }: Props) {
  const patch = (partial: Partial<WishAlertSettings>) => onChange({ ...value, ...partial });

  return (
    <section className="space-y-3 rounded-2xl border-2 border-outline bg-white/80 p-3">
      <h4 className="text-xs font-extrabold uppercase tracking-wide text-on-surface-variant">通知條件設定</h4>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-on-surface">最新上架通知</p>
            <p className="mt-0.5 text-[10px] leading-snug text-on-surface-variant">
              若市集此前完全沒有人上架過此盲盒，有人首次上架時通知
            </p>
          </div>
          <ToggleSwitch
            checked={value.newListingNotify}
            onChange={(newListingNotify) => patch({ newListingNotify })}
            aria-label="最新上架通知開關"
          />
        </div>

        <div className="flex items-start gap-3 border-t border-black/[0.06] pt-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-on-surface">降價通知</p>
            <p className="mt-0.5 text-[10px] leading-snug text-on-surface-variant">
              市集有上架且價格低於指定金額時通知
              {lowestMarketHint != null ? (
                <span className="block text-primary">目前最低售價 NT$ {lowestMarketHint}</span>
              ) : null}
            </p>
          </div>
          <ToggleSwitch
            checked={value.priceDropEnabled}
            onChange={(priceDropEnabled) => patch({ priceDropEnabled })}
            aria-label="降價通知開關"
          />
        </div>
        <div
          className={cn(
            'flex items-center gap-2 rounded-xl border-2 border-outline bg-white px-3 py-2',
            !value.priceDropEnabled && 'opacity-50'
          )}
        >
          <span className="shrink-0 text-xs font-bold text-on-surface-variant">NT$</span>
          <input
            type="number"
            min={0}
            step={1}
            disabled={!value.priceDropEnabled}
            value={value.priceDropMax ?? ''}
            onChange={(e) => {
              const raw = e.target.value;
              patch({ priceDropMax: raw === '' ? null : Number(raw) });
            }}
            placeholder="輸入金額"
            className="min-w-0 flex-1 bg-transparent text-sm font-bold text-on-surface outline-none disabled:cursor-not-allowed"
            aria-label="降價通知金額上限"
          />
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-black/[0.06] pt-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-on-surface">拆盒通知</p>
            <p className="mt-0.5 text-[10px] text-on-surface-variant">有人發布拆盒／分售貼文時通知</p>
          </div>
          <ToggleSwitch
            checked={value.unboxNotify}
            onChange={(unboxNotify) => patch({ unboxNotify })}
            aria-label="拆盒通知開關"
          />
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-on-surface">交換通知</p>
            <p className="mt-0.5 text-[10px] text-on-surface-variant">有人發布「我想換」交換貼文時通知</p>
          </div>
          <ToggleSwitch
            checked={value.exchangeNotify}
            onChange={(exchangeNotify) => patch({ exchangeNotify })}
            aria-label="交換通知開關"
          />
        </div>
      </div>
    </section>
  );
}
