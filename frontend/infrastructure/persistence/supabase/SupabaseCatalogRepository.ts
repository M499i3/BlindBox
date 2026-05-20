import type { CatalogProduct, CatalogShowcase } from '@/frontend/domain/entities/catalog';
import type { ICatalogRepository } from '@/frontend/domain/repositories/ICatalogRepository';

/**
 * Supabase 圖鑑實作（預留）
 * 接上後端時實作 select from catalog_products 等
 */
export class SupabaseCatalogRepository implements ICatalogRepository {
  getShowcase(): CatalogShowcase {
    throw new Error(
      'SupabaseCatalogRepository 尚未實作。請使用 VITE_DATA_SOURCE=local，或完成 server API。'
    );
  }

  getProductById(_id: string): CatalogProduct | undefined {
    throw new Error('SupabaseCatalogRepository 尚未實作');
  }
}
