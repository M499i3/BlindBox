import React, { useMemo } from 'react';
import { buildMockPriceTrend, type PricePoint, parsePriceNumber } from '@/frontend/shared/utils/priceTrend';

type PriceTrendChartProps = {
  /** 用來產生穩定走勢的 seed（例如商品 id） */
  seed: string;
  /** 用來顯示與校準最後一點 */
  currentPriceText?: string;
  title?: string;
  subtitle?: string;
  points?: number;
};

function pointsToPath(points: PricePoint[], w: number, h: number, pad = 6): string {
  const ys = points.map((p) => p.value);
  const min = Math.min(...ys);
  const max = Math.max(...ys);
  const range = Math.max(1, max - min);
  const innerW = w - pad * 2;
  const innerH = h - pad * 2;

  return points
    .map((p, idx) => {
      const x = pad + (innerW * idx) / Math.max(1, points.length - 1);
      const y = pad + innerH - ((p.value - min) / range) * innerH;
      return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
}

export default function PriceTrendChart({
  seed,
  currentPriceText,
  title = '價格趨勢',
  subtitle = '最近 14 天（示意）',
  points = 14,
}: PriceTrendChartProps) {
  const series = useMemo(() => buildMockPriceTrend(seed, currentPriceText, points), [seed, currentPriceText, points]);
  const current = parsePriceNumber(currentPriceText);

  const W = 320;
  const H = 64;
  const line = useMemo(() => pointsToPath(series, W, H, 6), [series]);

  const values = series.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);

  return (
    <section className="glass-card rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black text-on-surface tracking-wider uppercase">{title}</p>
          <p className="text-xs text-on-surface-variant mt-1">{subtitle}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[11px] text-on-surface-variant font-semibold">目前</p>
          <p className="text-lg font-extrabold text-on-surface whitespace-nowrap">
            {current ? `NT$ ${current.toLocaleString()}` : currentPriceText ?? '—'}
          </p>
        </div>
      </div>

      <div className="mt-3 rounded-2xl bg-background p-3">
        <svg width="100%" height="64" viewBox={`0 0 ${W} ${H}`} aria-hidden>
          <path d={line} fill="none" stroke="var(--color-secondary)" strokeWidth="4" strokeLinecap="round" />
        </svg>
        <div className="mt-2 flex items-center justify-between text-[11px] text-on-surface-variant font-semibold">
          <span>低：NT$ {min.toLocaleString()}</span>
          <span>高：NT$ {max.toLocaleString()}</span>
        </div>
      </div>
    </section>
  );
}

