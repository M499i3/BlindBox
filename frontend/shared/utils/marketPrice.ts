import type { Listing } from '@/frontend/domain/entities/listing';
import { filterListingsByFuzzyQuery } from '@/frontend/shared/utils/searchListings';

/** 從價格字串（如 HK$ 120.00）解析數值 */
export function parseListingPrice(price: string | undefined): number | null {
  if (!price?.trim()) return null;
  const m = price.replace(/,/g, '').match(/(\d+(?:\.\d+)?)/);
  if (!m) return null;
  const n = parseFloat(m[1]);
  return Number.isFinite(n) ? n : null;
}

function isSaleListing(item: Listing): boolean {
  const tm = item.tradeMode ?? '';
  return tm.includes('賣') || tm.includes('買') || (!tm.includes('換') && !tm.includes('拆'));
}

/**
 * 依盲盒名稱模糊比對市集貼文，回傳「我要賣」類貼文的最低售價（HKD）。
 */
export function getLowestMarketPriceForTitle(title: string, posts: Listing[]): number | null {
  const q = title.trim();
  if (!q) return null;

  const matched = filterListingsByFuzzyQuery(posts, q).filter(isSaleListing);
  let min: number | null = null;

  for (const item of matched) {
    const value = parseListingPrice(item.price);
    if (value == null) continue;
    if (min == null || value < min) min = value;
  }

  return min;
}

export function formatHkdAmount(amount: number | null): string {
  if (amount == null) return '';
  return amount % 1 === 0 ? String(Math.round(amount)) : amount.toFixed(2);
}
