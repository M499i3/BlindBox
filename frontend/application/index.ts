/**
 * 應用邏輯層 — Service 匯出（全端三層架構）
 * @see docs/ARCHITECTURE.md
 */
export { CatalogService } from '@/frontend/application/services/CatalogService';
export { ListingService } from '@/frontend/application/services/ListingService';
export { CartService } from '@/frontend/application/services/CartService';
export { ProfileService } from '@/frontend/application/services/ProfileService';
export { MarketplaceService } from '@/frontend/application/services/MarketplaceService';

export type {
  MarketplaceRankingItem,
  MarketplaceRecommendation,
} from '@/frontend/application/services/MarketplaceService';
