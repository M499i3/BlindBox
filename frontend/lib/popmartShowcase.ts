/**
 * @deprecated 請改用 useCatalog() 或 getAppContainer().catalogService
 * 保留相容舊頁面 import 路徑
 */
import type {
  CatalogProduct,
  CatalogShowcase,
} from '@/frontend/domain/entities/catalog';
import { getAppContainer } from '@/frontend/infrastructure/di/getAppContainer';

const catalog = getAppContainer().catalogService;

export type ShowcaseProduct = CatalogProduct;
export type PopmartShowcase = CatalogShowcase;

export const popmartShowcase = catalog.getShowcase();

export const deriveBrandLabel = (title: string) =>
  catalog.deriveBrandLabel(title);

export const buildBrandRow = (products: ShowcaseProduct[], max = 4) =>
  catalog.buildBrandRow(products, max);

export const getProductById = (id: string) => catalog.getProductById(id);

export const searchProducts = (query: string) => catalog.searchProducts(query);

export const productsByBrandSlug = (slug: string) =>
  catalog.productsByBrandSlug(slug);
