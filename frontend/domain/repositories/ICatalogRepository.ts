import type { CatalogProduct, CatalogShowcase } from '@/frontend/domain/entities/catalog';

/**
 * 圖鑑資料存取埠（Port）— 僅負責讀取原始資料
 * 搜尋、品牌比對等規則放在 CatalogService（業務邏輯層）
 */
export interface ICatalogRepository {
  getShowcase(): CatalogShowcase;
  getProductById(id: string): CatalogProduct | undefined;
}
