import type { TradeMode } from '@/frontend/shared/utils/tradeMode';

/** 首頁依盲盒名稱與買／拆／換模式篩選貼文的 URL */
export function buildHomeTradeSearchUrl(
  productTitle: string,
  mode: TradeMode = 'buy'
): string {
  const q = productTitle.trim();
  if (!q) return `/?mode=${mode}`;
  return `/?mode=${mode}&q=${encodeURIComponent(q)}`;
}

/** 商城搜尋頁：依盲盒名稱查貼文結果 */
export function buildMarketplaceSearchUrl(productTitle: string): string {
  const q = productTitle.trim();
  if (!q) return '/search';
  return `/search?q=${encodeURIComponent(q)}`;
}

/** @deprecated 使用 buildHomeTradeSearchUrl */
export const buildShopSearchUrl = buildHomeTradeSearchUrl;
