import { invalidateCache } from '@/frontend/shared/utils/fetchCache';

export function invalidateCatalogCache(): void {
  invalidateCache('catalog:');
}

export function invalidateMarketplaceCache(): void {
  invalidateCache('marketplace:');
}

/** 發文／上架後：只讓市集快取失效。圖鑑資料由管理員維護，不隨使用者貼文異動。 */
export function invalidateCachesAfterListingPublish(): void {
  invalidateMarketplaceCache();
}
