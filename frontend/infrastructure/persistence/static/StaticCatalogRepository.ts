import type { CatalogProduct, CatalogShowcase } from '@/frontend/domain/entities/catalog';
import type { ICatalogRepository } from '@/frontend/domain/repositories/ICatalogRepository';
import showcaseJson from '@/frontend/data/popmart-hk-showcase.json';

const showcase = showcaseJson as CatalogShowcase;

/** 靜態 JSON 圖鑑實作（開發／原型階段） */
export class StaticCatalogRepository implements ICatalogRepository {
  getShowcase(): CatalogShowcase {
    return showcase;
  }

  getProductById(id: string): CatalogProduct | undefined {
    return showcase.products.find((p) => p.id === id);
  }
}
