function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(a: number) {
  return function rand() {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function parsePriceNumber(priceText: string | undefined): number | null {
  if (!priceText) return null;
  const n = Number(String(priceText).replace(/[^\d.]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export type PricePoint = { label: string; value: number };

/** 產生穩定（seed 決定）的示意價格走勢資料 */
export function buildMockPriceTrend(seed: string, currentPriceText?: string, points = 14): PricePoint[] {
  const base = parsePriceNumber(currentPriceText) ?? 650;
  const rand = mulberry32(hashSeed(seed));

  // 讓最後一點落在 base 附近
  const volatility = 0.06 + rand() * 0.08; // 6% ~ 14%
  let v = base * (0.92 + rand() * 0.16);
  const out: PricePoint[] = [];

  for (let i = 0; i < points; i += 1) {
    const drift = (rand() - 0.5) * base * volatility * 0.35;
    const pullToBase = (base - v) * (0.08 + rand() * 0.06);
    v = Math.max(10, v + drift + pullToBase);
    out.push({ label: i === points - 1 ? '今天' : `${points - i - 1}d`, value: Math.round(v) });
  }

  // 強制最後一點接近當前價格
  out[out.length - 1] = { label: '今天', value: Math.round(base) };
  return out;
}

