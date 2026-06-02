import type { BrandRow, CatalogProduct, SeriesRow, StyleRow } from '../../domain/entities/catalog';
import { apiFetch } from './apiClient';

type ApiProduct = { id: string; title: string; price: string; image: string; source_url: string };

function toFrontend(p: ApiProduct): CatalogProduct {
  return { id: p.id, title: p.title, price: p.price, image: p.image, sourceUrl: p.source_url };
}

export async function getCatalogProducts(opts?: {
  q?: string;
  brand?: string;
  series?: string;
}): Promise<CatalogProduct[]> {
  const params = new URLSearchParams();
  if (opts?.q) params.set('q', opts.q);
  if (opts?.brand) params.set('brand', opts.brand);
  if (opts?.series) params.set('series', opts.series);
  const qs = params.toString();
  const items = await apiFetch<ApiProduct[]>(`/api/catalog/products${qs ? `?${qs}` : ''}`);
  return items.map(toFrontend);
}

export async function getCatalogProductById(id: string): Promise<CatalogProduct> {
  const p = await apiFetch<ApiProduct>(`/api/catalog/products/${encodeURIComponent(id)}`);
  return toFrontend(p);
}

export function getCatalogBrands(): Promise<BrandRow[]> {
  return apiFetch<BrandRow[]>('/api/catalog/brands');
}

export function getCatalogSeries(brandSlug: string): Promise<SeriesRow[]> {
  const qs = new URLSearchParams({ brand: brandSlug }).toString();
  return apiFetch<SeriesRow[]>(`/api/catalog/series?${qs}`);
}

export function getCatalogStyles(brandSlug: string, seriesSlug: string): Promise<StyleRow[]> {
  const qs = new URLSearchParams({ brand: brandSlug, series: seriesSlug }).toString();
  return apiFetch<StyleRow[]>(`/api/catalog/styles?${qs}`);
}
