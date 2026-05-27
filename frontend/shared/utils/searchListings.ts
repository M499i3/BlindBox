/** 搜尋用字串正規化（忽略大小寫、空白與引號） */
export function normalizeForSearch(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[''"]/g, '')
    .trim();
}

type SearchableListing = {
  title: string;
  itemName?: string;
};

/**
 * 依貼文名稱模糊比對：比對 title、itemName（子字串 + 多關鍵字皆需命中）
 */
export function listingMatchesFuzzyQuery(listing: SearchableListing, query: string): boolean {
  const q = query.trim();
  if (!q) return true;

  const nq = normalizeForSearch(q);
  const fields = [listing.title, listing.itemName ?? ''].map(normalizeForSearch);

  if (fields.some((f) => f.includes(nq))) return true;

  const tokens = q
    .toLowerCase()
    .split(/\s+/)
    .map((t) => normalizeForSearch(t))
    .filter((t) => t.length > 0);

  if (tokens.length > 1) {
    return fields.some((field) => tokens.every((t) => field.includes(t)));
  }

  return false;
}

export function filterListingsByFuzzyQuery<T extends SearchableListing>(
  listings: T[],
  query: string
): T[] {
  const q = query.trim();
  if (!q) return listings;
  return listings.filter((item) => listingMatchesFuzzyQuery(item, q));
}

type SearchableTitleItem = { id: string; title: string };

/**
 * 用 query 對 items.title 做模糊比對，回傳最佳匹配（簡易評分）
 * - 完全命中（normalize 後相等）最高分
 * - 子字串命中次之
 * - 多 token 命中再加分
 */
export function pickBestTitleMatch<T extends SearchableTitleItem>(items: T[], query: string): T | null {
  const q = query.trim();
  if (!q) return null;
  const nq = normalizeForSearch(q);
  const tokens = q
    .toLowerCase()
    .split(/\s+/)
    .map((t) => normalizeForSearch(t))
    .filter(Boolean);

  let best: { item: T; score: number } | null = null;

  for (const item of items) {
    const t = normalizeForSearch(item.title);
    let score = 0;
    if (t === nq) score += 1000;
    if (t.includes(nq) || nq.includes(t)) score += 300;
    if (tokens.length > 1 && tokens.every((x) => t.includes(x))) score += 180;
    // 更接近的長度差給一點加分
    score -= Math.min(80, Math.abs(t.length - nq.length));
    if (!best || score > best.score) best = { item, score };
  }

  // 避免太鬆的誤匹配
  if (!best || best.score < 220) return null;
  return best.item;
}
