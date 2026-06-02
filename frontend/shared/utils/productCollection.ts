import type { CatalogProduct } from '@/frontend/domain/entities/catalog';
import type { Listing } from '@/frontend/domain/entities/listing';
import { pickBestTitleMatch } from '@/frontend/shared/utils/searchListings';

/** localStorage 中 wishIds / ownedIds 儲存的是圖鑑 CatalogProduct.id */
export type ProductCollectionStore = {
  wishProductIds: string[];
  ownedProductIds: string[];
};

type ListingLike = Pick<Listing, 'id' | 'title' | 'itemName'>;

const LEGACY_PREFIXES = ['series:', 'subseries:'];

export function isLegacyCollectionKey(id: string): boolean {
  return LEGACY_PREFIXES.some((p) => id.startsWith(p));
}

/** 無法對應圖鑑時，以 listing 前綴僅存於本地 */
export function isLocalOnlyCollectionId(id: string): boolean {
  return id.startsWith('listing:');
}

export function resolveProductIdFromListing(
  listing: ListingLike,
  products: CatalogProduct[]
): string | null {
  if (listing.id.startsWith('pm_')) {
    return listing.id.slice(3);
  }

  if (!products.length) return null;

  const query = (listing.itemName || listing.title || '').trim();
  if (!query) return null;
  const match = pickBestTitleMatch(products, query);
  return match?.id ?? null;
}

export function resolveProductIdFromTitle(
  title: string,
  products: CatalogProduct[]
): string | null {
  const q = title.trim();
  if (!q || !products.length) return null;
  return pickBestTitleMatch(products, q)?.id ?? null;
}

/**
 * 解析收藏／想要用的 product id。
 * 優先圖鑑 id；匹配失敗時 fallback 為 listing:${listing.id}（僅本地狀態）。
 */
export function resolveCollectionId(
  listing: ListingLike & { image?: string },
  products: CatalogProduct[]
): string {
  if (listing.id.startsWith('pm_')) {
    return listing.id.slice(3);
  }

  const fromListing = resolveProductIdFromListing(listing, products);
  if (fromListing) return fromListing;

  const title = (listing.itemName || listing.title || '').trim();
  const fromTitle = title ? resolveProductIdFromTitle(title, products) : null;
  if (fromTitle) return fromTitle;

  return `listing:${listing.id}`;
}

/** 由貼文建立可顯示於「想要」視窗的圖鑑商品（匹配失敗時用貼文資料兜底） */
export function catalogProductFromListing(
  listing: ListingLike & { image?: string },
  products: CatalogProduct[]
): CatalogProduct {
  const pid = resolveProductIdFromListing(listing, products);
  if (pid && !pid.startsWith('listing:')) {
    const matched = products.find((p) => p.id === pid);
    if (matched) return matched;
  }
  const collectionId = resolveCollectionId(listing, products);
  return {
    id: collectionId.startsWith('listing:') ? collectionId : pid ?? collectionId,
    title: (listing.itemName || listing.title || '未知盲盒').trim(),
    price: '',
    image: listing.image ?? '',
    sourceUrl: '',
  };
}

/** 確認加入想要前，解析為可儲存的 product id */
export function resolveStorableWishProductId(
  product: CatalogProduct,
  products: CatalogProduct[],
  listing?: ListingLike | null
): string | null {
  if (product.id && products.some((p) => p.id === product.id)) {
    return product.id;
  }
  if (product.id.startsWith('listing:')) {
    return product.id;
  }
  if (listing) {
    return resolveCollectionId(listing, products);
  }
  return resolveProductIdFromTitle(product.title, products);
}

const productIdSet = (products: CatalogProduct[]) => new Set(products.map((p) => p.id));

/** 將舊版 listing id / pm_ / series: 鍵遷移為圖鑑 product id */
export function migrateCollectionIds(
  ids: string[],
  products: CatalogProduct[],
  posts: ListingLike[]
): string[] {
  const valid = productIdSet(products);
  const next = new Set<string>();

  for (const id of ids) {
    if (valid.has(id)) {
      next.add(id);
      continue;
    }
    if (isLegacyCollectionKey(id)) continue;
    if (isLocalOnlyCollectionId(id)) {
      next.add(id);
      continue;
    }

    if (id.startsWith('pm_')) {
      const pid = id.slice(3);
      if (valid.has(pid)) next.add(pid);
      else next.add(pid);
      continue;
    }

    const post = posts.find((p) => p.id === id);
    if (post) {
      next.add(resolveCollectionId(post, products));
    }
  }

  return [...next];
}

export function idsEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].sort();
  const sb = [...b].sort();
  return sa.every((v, i) => v === sb[i]);
}

/** 合併伺服器回傳 id 與僅存本地的 listing: 鍵，避免 API 同步覆寫本地 fallback */
export function mergeServerCollectionIds(serverIds: string[], localIds: string[]): string[] {
  const localOnly = localIds.filter(isLocalOnlyCollectionId);
  return [...new Set([...serverIds, ...localOnly])];
}

/** 將 product id 正規化為圖鑑 CatalogProduct.id（external_id） */
export function canonicalProductId(id: string, products: CatalogProduct[]): string {
  if (!id || isLocalOnlyCollectionId(id)) return id;
  const hit = products.find((p) => p.id === id);
  return hit?.id ?? id;
}

/** 比對 stored id 與商品 id（含同一商品不同鍵格式的過渡期） */
export function isProductInCollection(
  storedIds: string[],
  productId: string,
  products: CatalogProduct[]
): boolean {
  if (storedIds.includes(productId)) return true;
  const canonical = canonicalProductId(productId, products);
  if (storedIds.includes(canonical)) return true;
  for (const stored of storedIds) {
    if (canonicalProductId(stored, products) === canonical) return true;
  }
  return false;
}
