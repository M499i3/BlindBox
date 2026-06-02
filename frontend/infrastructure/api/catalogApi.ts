import type {
  BrandRow,
  CatalogProduct,
  CatalogSearchResult,
  SeriesRow,
  StyleRow,
} from '../../domain/entities/catalog';
import { apiFetch } from './apiClient';

type ApiProduct = {
  id: string;
  title: string;
  price: string;
  image: string;
  source_url: string;
  brand_slug?: string | null;
  brand_name?: string | null;
  series_slug?: string | null;
  series_name?: string | null;
};

type ApiSearchSeries = {
  id: string;
  slug: string;
  name: string;
  image?: string;
  count?: number;
  brand_slug: string;
  brand_name: string;
};

function toFrontend(p: ApiProduct): CatalogProduct {
  return {
    id: p.id,
    title: p.title,
    price: p.price,
    image: p.image,
    sourceUrl: p.source_url,
    brandSlug: p.brand_slug ?? undefined,
    brandName: p.brand_name ?? undefined,
    seriesSlug: p.series_slug ?? undefined,
    seriesName: p.series_name ?? undefined,
  };
}

function toSeriesRow(s: ApiSearchSeries): SeriesRow {
  return {
    id: s.id,
    slug: s.slug,
    name: s.name,
    image: s.image,
    count: s.count,
    brandSlug: s.brand_slug,
    brandName: s.brand_name,
  };
}

export async function getCatalogSearch(query: string): Promise<CatalogSearchResult> {
  const qs = new URLSearchParams({ q: query.trim() }).toString();
  const data = await apiFetch<{
    brands: BrandRow[];
    series: ApiSearchSeries[];
    products: ApiProduct[];
  }>(`/api/catalog/search?${qs}`);
  return {
    brands: data.brands,
    series: data.series.map(toSeriesRow),
    products: data.products.map(toFrontend),
  };
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
