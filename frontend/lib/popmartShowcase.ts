/**
 * @deprecated 請改用 useCatalog() 或 getAppContainer().catalogService
 * 保留相容舊頁面 import 路徑
 *
 * 使用 Proxy 延遲讀取，避免在 Supabase bootstrap 完成前就快取靜態 JSON。
 */
import type {
  CatalogProduct,
  CatalogShowcase,
} from '@/frontend/domain/entities/catalog';
import { getAppContainer } from '@/frontend/infrastructure/di/getAppContainer';

export type ShowcaseProduct = CatalogProduct;
export type PopmartShowcase = CatalogShowcase;

function catalog() {
  return getAppContainer().catalogService;
}

function showcase(): CatalogShowcase {
  return catalog().getShowcase();
}

export const popmartShowcase = new Proxy({} as CatalogShowcase, {
  get(_target, prop) {
    const s = showcase();
    const value = s[prop as keyof CatalogShowcase];
    return typeof value === 'function'
      ? (value as (...args: unknown[]) => unknown).bind(s)
      : value;
  },
});

export const deriveBrandLabel = (title: string) =>
  catalog().deriveBrandLabel(title);

export const buildBrandRow = (products: ShowcaseProduct[], max = 4) =>
  catalog().buildBrandRow(products, max);

export const getProductById = (id: string) => catalog().getProductById(id);

export const searchProducts = (query: string) => catalog().searchProducts(query);

export const productsByBrandSlug = (slug: string) =>
  catalog().productsByBrandSlug(slug);
