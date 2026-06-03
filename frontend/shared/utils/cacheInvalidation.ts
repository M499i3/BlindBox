import { invalidateCache } from '@/frontend/shared/utils/fetchCache';

export function invalidateCatalogCache(): void {
  invalidateCache('catalog:');
}

export function invalidateMarketplaceCache(): void {
  invalidateCache('marketplace:');
}

/** 發文／上架後：圖鑑與首頁衍生快取一併失效 */
export function invalidateCachesAfterListingPublish(): void {
  invalidateCatalogCache();
  invalidateMarketplaceCache();
}
