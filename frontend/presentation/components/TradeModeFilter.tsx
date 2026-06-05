import React from 'react';
import { cn } from '@/frontend/shared/utils/cn';
import {
  TRADE_MODE_MEDIA,
  TRADE_MODE_TABS,
  type TradeMode,
} from '@/frontend/shared/utils/tradeMode';

type Props = {
  mode: TradeMode;
  onModeChange: (mode: TradeMode) => void;
  /** 未進入篩選檢視時不強調任一選項 */
  selectionActive?: boolean;
  className?: string;
};

export default function TradeModeFilter({
  mode,
  onModeChange,
  selectionActive = true,
  className,
}: Props) {
  return (
    <div className={cn('flex justify-around gap-2', className)}>
      {TRADE_MODE_TABS.map(({ key }) => {
        const meta = TRADE_MODE_MEDIA[key];
        const active = selectionActive && mode === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onModeChange(key)}
            aria-pressed={active}
            aria-label={`篩選：${meta.label}`}
            className="flex flex-1 flex-col items-center gap-1.5 border-0 bg-transparent p-2 shadow-none outline-none"
          >
            <span className="flex h-32 w-full items-center justify-center">
              <img
                src={meta.src}
                alt=""
                className={cn(
                  'object-contain transition-[width,height,opacity] duration-200',
                  key === 'unbox' && 'translate-y-0.5',
                  active
                    ? key === 'unbox'
                      ? 'h-32 w-32 opacity-100'
                      : 'h-28 w-28 opacity-100'
                    : key === 'unbox'
                      ? 'h-24 w-24 opacity-50'
                      : 'h-20 w-20 opacity-50'
                )}
                decoding="async"
              />
            </span>
            <span
              className={cn(
                'text-base font-black leading-none transition-colors',
                active ? 'text-accent-sky' : 'text-on-surface-variant'
              )}
            >
              {meta.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
