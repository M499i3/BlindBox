import React from 'react';
import { cn } from '@/frontend/shared/utils/cn';
import { TRADE_MODE_MEDIA } from '@/frontend/shared/utils/tradeMode';

export type ListingTradeType = 'sell' | 'swap' | 'split';

const OPTIONS: {
  type: ListingTradeType;
  title: string;
  subtitle: string;
  mediaKey: keyof typeof TRADE_MODE_MEDIA;
}[] = [
  {
    type: 'sell',
    title: '我要賣',
    subtitle: '直接標價出售，買家可加入購物車',
    mediaKey: 'buy',
  },
  {
    type: 'swap',
    title: '我想換',
    subtitle: '以物易物，買家需提出交換申請',
    mediaKey: 'swap',
  },
  {
    type: 'split',
    title: '發起拆盒團',
    subtitle: '買整盒、自留幾款，其餘開放認領',
    mediaKey: 'unbox',
  },
];

type Props = {
  onSelect: (type: ListingTradeType) => void;
};

export default function TradeModePicker({ onSelect }: Props) {
  return (
    <section className="space-y-4">
      <div>
        <p className="text-xl font-black tracking-tight text-black">選擇上架方式</p>
        <p className="mt-1.5 text-sm text-on-surface-variant">先選交易方式，再填寫對應內容</p>
      </div>
      <div className="space-y-3">
        {OPTIONS.map((opt) => {
          const meta = TRADE_MODE_MEDIA[opt.mediaKey];
          return (
            <button
              key={opt.type}
              type="button"
              onClick={() => onSelect(opt.type)}
              className={cn(
                'flex w-full items-center gap-4 rounded-2xl border-2 border-black bg-white p-4 text-left shadow-[4px_4px_0_#111] transition-transform active:scale-[0.99]'
              )}
            >
              <div className="flex h-20 w-20 shrink-0 items-center justify-center">
                <img src={meta.src} alt="" className="h-16 w-16 object-contain" decoding="async" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-base font-extrabold text-on-surface">{opt.title}</p>
                <p className="mt-0.5 text-xs text-on-surface-variant">{opt.subtitle}</p>
              </div>
              <span className="material-symbols-outlined shrink-0 text-on-surface-variant">chevron_right</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
