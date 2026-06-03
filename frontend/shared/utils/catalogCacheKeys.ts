import type { CatalogProduct } from '@/frontend/domain/entities/catalog';
import { peekCache, setCache } from '@/frontend/shared/utils/fetchCache';

export function catalogProductsKey(opts?: { q?: string; brand?: string; series?: string }): string {
  const parts = ['catalog:products'];
  if (opts?.q) parts.push(`q=${opts.q}`);
  if (opts?.brand) parts.push(`brand=${opts.brand}`);
  if (opts?.series) parts.push(`series=${opts.series}`);
  return parts.join('|');
}

export const CATALOG_BRANDS_KEY = 'catalog:brands';
export const catalogSeriesKey = (brandSlug: string) => `catalog:series|${brandSlug}`;
export const catalogStylesKey = (brandSlug: string, seriesSlug: string) =>
  `catalog:styles|${brandSlug}|${seriesSlug}`;
export const catalogProductKey = (id: string) => `catalog:product|${id}`;
export const catalogSearchKey = (q: string) => `catalog:search|${q.trim().toLowerCase()}`;

export function mergeProductIntoCatalogCache(product: CatalogProduct): void {
  const key = catalogProductsKey();
  const list = peekCache<CatalogProduct[]>(key);
  if (!list) return;
  const idx = list.findIndex((p) => p.id === product.id);
  const next = idx >= 0 ? list.map((p, i) => (i === idx ? product : p)) : [...list, product];
  setCache(key, next);
}
