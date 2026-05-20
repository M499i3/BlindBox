import type { CatalogProduct, CatalogShowcase } from '@/frontend/domain/entities/catalog';
import type { CatalogLoadMeta } from '@/frontend/domain/entities/catalogLoad';
import type { ICatalogRepository } from '@/frontend/domain/repositories/ICatalogRepository';
import showcaseJson from '@/frontend/data/popmart-hk-showcase.json';
import type { DbCatalogProduct } from '@/frontend/infrastructure/persistence/supabase/dbTypes';
import {
  catalogProductFromRow,
  showcaseFromProducts,
} from '@/frontend/infrastructure/persistence/supabase/mappers';
import { getSupabaseClient } from '@/frontend/infrastructure/persistence/supabase/supabaseClient';

const staticShowcase = showcaseJson as CatalogShowcase;

const CATALOG_SELECT =
  'id, external_id, series_id, title, official_price_amount, official_price_currency, image_url, source_url, is_secret, updated_at';

/** Supabase 圖鑑：啟動時從 catalog_products 載入並快取於記憶體 */
export class SupabaseCatalogRepository implements ICatalogRepository {
  private showcase: CatalogShowcase = staticShowcase;
  private loadMeta: CatalogLoadMeta = {
    kind: 'static',
    reason: 'bundled-json',
    count: staticShowcase.products.length,
  };
  private initPromise: Promise<void> | null = null;

  async initialize(): Promise<void> {
    if (this.initPromise) return this.initPromise;
    this.initPromise = this.loadFromSupabase().finally(() => {
      this.initPromise = null;
    });
    return this.initPromise;
  }

  private async loadFromSupabase(): Promise<void> {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('catalog_products')
      .select(CATALOG_SELECT)
      .order('updated_at', { ascending: false })
      .limit(500);

    if (error) {
      console.error(
        '[SupabaseCatalogRepository] 無法讀取 catalog_products，已退回靜態 JSON：',
        error.message
      );
      this.showcase = staticShowcase;
      this.loadMeta = {
        kind: 'static',
        reason: 'rest-error',
        detail: error.message,
        count: staticShowcase.products.length,
      };
      return;
    }

    const rows = (data ?? []) as DbCatalogProduct[];
    if (rows.length === 0) {
      console.warn(
        '[SupabaseCatalogRepository] catalog_products 為空，已退回靜態 JSON。請執行 npm run db:seed'
      );
      this.showcase = staticShowcase;
      this.loadMeta = {
        kind: 'static',
        reason: 'empty-table',
        count: staticShowcase.products.length,
      };
      return;
    }

    const products = rows.map(catalogProductFromRow);
    this.showcase = showcaseFromProducts(products, {
      scrapedAt: staticShowcase.scrapedAt,
      sourceUrl: staticShowcase.sourceUrl,
      jinaReader: staticShowcase.jinaReader,
      extraSources: staticShowcase.extraSources,
      ipHints: staticShowcase.ipHints,
      banners: staticShowcase.banners,
    });
    const first = rows[0];
    this.loadMeta = {
      kind: 'supabase',
      count: products.length,
      sampleExternalId: first.external_id ?? first.id,
      sampleTitle: first.title,
    };
    console.info(
      `[SupabaseCatalogRepository] 已從資料庫載入 ${products.length} 筆；` +
        `最新一筆：${first.external_id}「${first.title}」`
    );
  }

  getShowcase(): CatalogShowcase {
    return this.showcase;
  }

  getProductById(id: string): CatalogProduct | undefined {
    return this.showcase.products.find((p) => p.id === id);
  }

  getLoadMeta(): CatalogLoadMeta {
    return this.loadMeta;
  }
}
