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

export function resolveProductIdFromListing(
  listing: ListingLike,
  products: CatalogProduct[]
): string | null {
  if (!products.length) return null;

  if (listing.id.startsWith('pm_')) {
    const pid = listing.id.slice(3);
    if (products.some((p) => p.id === pid)) return pid;
  }

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

/** 由貼文建立可顯示於「想要」視窗的圖鑑商品（匹配失敗時用貼文資料兜底） */
export function catalogProductFromListing(
  listing: ListingLike & { image?: string },
  products: CatalogProduct[]
): CatalogProduct {
  const pid = resolveProductIdFromListing(listing, products);
  if (pid) {
    const matched = products.find((p) => p.id === pid);
    if (matched) return matched;
  }
  return {
    id: pid ?? `listing:${listing.id}`,
    title: (listing.itemName || listing.title || '未知盲盒').trim(),
    price: '',
    image: listing.image ?? '',
    sourceUrl: '',
  };
}

/** 確認加入想要前，解析為可儲存的圖鑑 product id */
export function resolveStorableWishProductId(
  product: CatalogProduct,
  products: CatalogProduct[],
  listing?: ListingLike | null
): string | null {
  if (product.id && !product.id.startsWith('listing:') && products.some((p) => p.id === product.id)) {
    return product.id;
  }
  if (listing) {
    const fromListing = resolveProductIdFromListing(listing, products);
    if (fromListing) return fromListing;
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

    if (id.startsWith('pm_')) {
      const pid = id.slice(3);
      if (valid.has(pid)) next.add(pid);
      continue;
    }

    const post = posts.find((p) => p.id === id);
    if (post) {
      const pid = resolveProductIdFromListing(post, products);
      if (pid) next.add(pid);
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
