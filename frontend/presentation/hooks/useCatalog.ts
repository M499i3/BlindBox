import { useEffect, useMemo, useState } from 'react';
import type { BrandRow, CatalogProduct, CatalogSearchResult } from '@/frontend/domain/entities/catalog';
import {
  getCatalogBrands,
  getCatalogProducts,
  getCatalogProductById,
  getCatalogSearch,
  getCatalogSeries,
  getCatalogStyles,
} from '@/frontend/infrastructure/api/catalogApi';
import type { SeriesRow, StyleRow } from '@/frontend/domain/entities/catalog';
import {
  deriveBrandLabel as deriveBrandLabelFromMock,
  filterMockProducts,
  getMockBrands,
  getProductById,
  isMockDataEnabled,
  buildMockCatalogSearch,
} from '@/frontend/lib/popmartShowcase';
import { fetchCached, peekCache, useCachedFetch } from '@/frontend/shared/utils/fetchCache';
import {
  CATALOG_BRANDS_KEY,
  catalogProductKey,
  catalogProductsKey,
  catalogSearchKey,
  catalogSeriesKey,
  catalogStylesKey,
  mergeProductIntoCatalogCache,
} from '@/frontend/shared/utils/catalogCacheKeys';

export { deriveBrandLabelFromMock as deriveBrandLabel };

export function buildBrandRow(products: CatalogProduct[], limit = 6): BrandRow[] {
  const seen = new Map<string, string>();
  for (const p of products) {
    const name = deriveBrandLabelFromMock(p.title);
    if (!seen.has(name)) seen.set(name, p.image);
    if (seen.size >= limit) break;
  }
  return Array.from(seen, ([name, image]) => ({ name, image }));
}

export function useCatalogProducts(opts?: { q?: string; brand?: string; series?: string }) {
  const mock = isMockDataEnabled();
  const cacheKey = mock ? null : catalogProductsKey(opts);

  const mockProducts = useMemo(
    () => (mock ? filterMockProducts(opts) : []),
    [mock, opts?.q, opts?.brand, opts?.series]
  );

  const { data, loading } = useCachedFetch(
    cacheKey,
    () => getCatalogProducts(opts).catch(() => filterMockProducts(opts)),
    [opts?.q, opts?.brand, opts?.series],
    {
      enabled: !mock,
      initial: mock ? mockProducts : [],
    }
  );

  if (mock) {
    return { products: mockProducts, loading: false };
  }

  return { products: data ?? [], loading };
}

export function useCatalogProduct(id: string | undefined) {
  const mock = isMockDataEnabled();
  const mockProduct = useMemo(
    () => (mock && id ? getProductById(id) ?? null : null),
    [mock, id]
  );

  const allProducts = peekCache<CatalogProduct[]>(catalogProductsKey());
  const fromList = id && allProducts ? allProducts.find((p) => p.id === id) : undefined;

  const [product, setProduct] = useState<CatalogProduct | null>(
    mock ? mockProduct : fromList ?? null
  );
  const [loading, setLoading] = useState(!mock && !!id && !fromList);

  useEffect(() => {
    if (!id) return;
    if (mock) {
      setProduct(getProductById(id) ?? null);
      setLoading(false);
      return;
    }

    const cachedList = peekCache<CatalogProduct[]>(catalogProductsKey());
    const inList = cachedList?.find((p) => p.id === id);
    if (inList) {
      setProduct(inList);
      setLoading(false);
      return;
    }

    const cachedOne = peekCache<CatalogProduct>(catalogProductKey(id));
    if (cachedOne) {
      setProduct(cachedOne);
      setLoading(false);
      return;
    }

    setLoading(true);
    fetchCached(catalogProductKey(id), () => getCatalogProductById(id))
      .then((p) => {
        mergeProductIntoCatalogCache(p);
        setProduct(p);
      })
      .catch(() => setProduct(getProductById(id) ?? null))
      .finally(() => setLoading(false));
  }, [mock, id]);

  return { product, loading };
}

export function useCatalogBrands() {
  const mock = isMockDataEnabled();

  const { data } = useCachedFetch(
    mock ? null : CATALOG_BRANDS_KEY,
    () => getCatalogBrands().catch(() => getMockBrands()),
    [mock],
    { enabled: !mock, initial: [] as BrandRow[] }
  );

  if (mock) return getMockBrands();
  return data ?? [];
}

export function useCatalogSeries(brandSlug: string | undefined) {
  const mock = isMockDataEnabled();
  const key = mock || !brandSlug ? null : catalogSeriesKey(brandSlug);

  const { data, loading } = useCachedFetch(
    key,
    () => getCatalogSeries(brandSlug!).catch(() => [] as SeriesRow[]),
    [brandSlug],
    { enabled: !mock && !!brandSlug, initial: [] as SeriesRow[] }
  );

  if (mock || !brandSlug) {
    return { series: [] as SeriesRow[], loading: false };
  }

  return { series: data ?? [], loading };
}

export function useCatalogStyles(brandSlug: string | undefined, seriesSlug: string | undefined) {
  const mock = isMockDataEnabled();
  const key =
    mock || !brandSlug || !seriesSlug ? null : catalogStylesKey(brandSlug, seriesSlug);

  const { data, loading } = useCachedFetch(
    key,
    () => getCatalogStyles(brandSlug!, seriesSlug!).catch(() => [] as StyleRow[]),
    [brandSlug, seriesSlug],
    { enabled: !mock && !!brandSlug && !!seriesSlug, initial: [] as StyleRow[] }
  );

  if (mock || !brandSlug || !seriesSlug) {
    return { styles: [] as StyleRow[], loading: false };
  }

  return { styles: data ?? [], loading };
}

export function useCatalogSearch(query: string) {
  const mock = isMockDataEnabled();
  const trimmed = query.trim();
  const key = mock || !trimmed ? null : catalogSearchKey(trimmed);

  const { data, loading } = useCachedFetch(
    key,
    () =>
      getCatalogSearch(trimmed).catch(() => buildMockCatalogSearch(trimmed)),
    [trimmed],
    { enabled: !mock && trimmed.length > 0 }
  );

  if (!trimmed) {
    return { result: null as CatalogSearchResult | null, loading: false };
  }

  if (mock) {
    return { result: buildMockCatalogSearch(trimmed), loading: false };
  }

  return { result: data ?? null, loading };
}
