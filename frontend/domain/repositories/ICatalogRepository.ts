import type { CatalogProduct, CatalogShowcase } from '@/frontend/domain/entities/catalog';
import type { CatalogLoadMeta } from '@/frontend/domain/entities/catalogLoad';

/**
 * 圖鑑資料存取埠（Port）— 僅負責讀取原始資料
 * 搜尋、品牌比對等規則放在 CatalogService（業務邏輯層）
 */
export interface ICatalogRepository {
  /** 載入資料（Supabase 為非同步；local 可為 no-op） */
  initialize(): Promise<void>;
  getShowcase(): CatalogShowcase;
  getProductById(id: string): CatalogProduct | undefined;
  /** 最近一次 initialize 的載入來源（local 為 bundled-json） */
  getLoadMeta(): CatalogLoadMeta;
}
