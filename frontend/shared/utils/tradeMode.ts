import type { Listing } from '@/frontend/domain/entities/listing';

export type TradeMode = 'buy' | 'unbox' | 'swap';

export const TRADE_MODE_TABS: { key: TradeMode; label: string }[] = [
  { key: 'buy', label: '買' },
  { key: 'unbox', label: '拆' },
  { key: 'swap', label: '換' },
];

export const TRADE_MODE_MEDIA: Record<
  TradeMode,
  { label: string; src: string; alt: string }
> = {
  buy: { label: '買', src: '/Teddy%20Bear.svg?v=2', alt: 'Teddy Bear' },
  unbox: { label: '拆', src: '/split-box.svg?v=2', alt: 'split box' },
  swap: { label: '換', src: '/exchange-box.svg?v=2', alt: 'exchange box' },
};

export function parseTradeMode(raw: string | null): TradeMode {
  if (raw === 'buy' || raw === 'unbox' || raw === 'swap') return raw;
  return 'buy';
}

export function isTradeModeParam(raw: string | null): raw is TradeMode {
  return raw === 'buy' || raw === 'unbox' || raw === 'swap';
}

function isSwapModeListing(item: Pick<Listing, 'tradeMode' | 'allowSwap'>): boolean {
  const tm = item.tradeMode ?? '';
  return item.allowSwap || tm.includes('換');
}

export function listingMatchesTradeMode(item: Listing, mode: TradeMode): boolean {
  const tm = item.tradeMode ?? '';
  const isSwap = isSwapModeListing(item);

  if (mode === 'swap') return isSwap;
  // 曾勾選「開放交換」或交易方式為換：僅出現在「換」，不出現在買／拆
  if (isSwap) return false;

  if (mode === 'unbox') {
    return isSplitBoxListing(item);
  }
  return tm.includes('賣') || tm.includes('買') || (!tm.includes('換') && !tm.includes('拆'));
}

export function tradeModeBadge(mode: TradeMode): string {
  if (mode === 'buy') return '可購買';
  if (mode === 'unbox') return '可拆盒';
  return '可交換';
}

export function isSwapListing(item: Pick<Listing, 'tradeMode' | 'allowSwap'>): boolean {
  return isSwapModeListing(item);
}

/** 拆盒團貼文（勿用「已拆盒」等狀態欄位判斷） */
export function isSplitBoxListing(
  item: Pick<Listing, 'tradeMode'> & { splitBoxGroupId?: string | null }
): boolean {
  if (item.splitBoxGroupId) return true;
  const tm = item.tradeMode ?? '';
  return (
    tm.includes('拆盒') ||
    tm.includes('加入拆盒') ||
    tm.includes('group_buy')
  );
}

export type ListingTradeKind = 'sell' | 'split' | 'swap';

export function listingTradeKind(
  item: Pick<Listing, 'tradeMode' | 'allowSwap'> & { splitBoxGroupId?: string | null }
): ListingTradeKind {
  if (isSwapListing(item)) return 'swap';
  if (isSplitBoxListing(item)) return 'split';
  return 'sell';
}
