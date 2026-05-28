/**
 * 「想要 / 收藏冊」資料結構（Schema）
 *
 * 儲存層（localStorage `blindbox_app_state_v1`）：
 * - wishIds: CatalogProduct.id[]
 * - ownedIds: CatalogProduct.id[]
 *
 * 貼文頁點擊時，先以 listing.title / itemName 對圖鑑做模糊比對，
 * 再寫入對應的 product id（見 productCollection.ts）。
 */

export type {
  BrandNode,
  CatalogHierarchy,
  CollectionProgress,
  IpNode,
  ProductLeaf,
  SeriesNode,
} from '@/frontend/shared/utils/catalogHierarchy';

export type { ProductCollectionStore } from '@/frontend/shared/utils/productCollection';
export type { WishAlertSettings } from '@/frontend/domain/entities/wishAlert';
