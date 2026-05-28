/** 商城依盲盒名稱篩選貼文的 URL */
export function buildShopSearchUrl(
  productTitle: string,
  mode: 'buy' | 'unbox' | 'swap' = 'buy'
): string {
  const q = productTitle.trim();
  if (!q) return `/shop?mode=${mode}`;
  return `/shop?mode=${mode}&q=${encodeURIComponent(q)}`;
}
