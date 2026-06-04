import { useEffect, useMemo, useRef, useState } from 'react';
import type { BrandRow, CatalogProduct, CatalogSearchResult } from '@/frontend/domain/entities/catalog';
import {
  getCatalogBrands,
  getCatalogProducts,
  getCatalogProductById,
  getCatalogSearch,
  getCatalogIps,
  getCatalogSeries,
  getCatalogStyles,
} from '@/frontend/infrastructure/api/catalogApi';
import type { IpRow, SeriesRow, StyleRow } from '@/frontend/domain/entities/catalog';
import {
  deriveBrandLabel as deriveBrandLabelFromMock,
  filterMockProducts,
  getMockBrands,
  getProductById,
  isMockDataEnabled,
  buildMockCatalogSearch,
} from '@/frontend/lib/popmartShowcase';
import {
  fetchCached,
  peekCache,
  useCacheGeneration,
  useCachedFetch,
} from '@/frontend/shared/utils/fetchCache';
import {
  CATALOG_BRANDS_KEY,
  catalogProductKey,
  catalogProductsKey,
  catalogSearchKey,
  catalogIpsKey,
  catalogProductSeriesKey,
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

export function useCatalogProducts(opts?: {
  q?: string;
  brand?: string;
  ip?: string;
  series?: string;
  /** API mode: skip fetch when false (avoids loading full catalog). */
  enabled?: boolean;
}) {
  const mock = isMockDataEnabled();
  const enabled = opts?.enabled !== false;
  const cacheKey = mock || !enabled ? null : catalogProductsKey(opts);

  const mockProducts = useMemo(
    () => (mock ? filterMockProducts(opts) : []),
    [mock, opts?.q, opts?.brand, opts?.ip, opts?.series]
  );

  const { data, loading } = useCachedFetch(
    cacheKey,
    () => getCatalogProducts(opts).catch(() => filterMockProducts(opts)),
    [opts?.q, opts?.brand, opts?.ip, opts?.series, enabled],
    {
      enabled: !mock && enabled,
      initial: mock ? mockProducts : [],
    }
  );

  if (mock) {
    return { products: mockProducts, loading: false };
  }

  if (!enabled) {
    return { products: [], loading: false };
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
  const cacheGeneration = useCacheGeneration();
  const prevGenerationRef = useRef(cacheGeneration);

  useEffect(() => {
    if (!id) return;
    if (mock) {
      setProduct(getProductById(id) ?? null);
      setLoading(false);
      return;
    }

    const force = cacheGeneration !== prevGenerationRef.current;
    prevGenerationRef.current = cacheGeneration;

    const cachedList = peekCache<CatalogProduct[]>(catalogProductsKey());
    const inList = cachedList?.find((p) => p.id === id);
    const cachedOne = peekCache<CatalogProduct>(catalogProductKey(id));

    if (!force) {
      if (inList) {
        setProduct(inList);
        setLoading(false);
        return;
      }
      if (cachedOne) {
        setProduct(cachedOne);
        setLoading(false);
        return;
      }
    } else if (inList || cachedOne) {
      setProduct(inList ?? cachedOne ?? null);
      setLoading(false);
    } else {
      setLoading(true);
    }

    const fetcher = () => getCatalogProductById(id);
    const run = force
      ? fetchCached(catalogProductKey(id), fetcher, { force: true, staleMs: 0 })
      : fetchCached(catalogProductKey(id), fetcher);

    run
      .then((p) => {
        mergeProductIntoCatalogCache(p);
        setProduct(p);
      })
      .catch(() => setProduct(getProductById(id) ?? null))
      .finally(() => setLoading(false));
  }, [mock, id, cacheGeneration]);

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

/** 品牌下的 IP 列表（DB `ips`） */
export function useCatalogIps(brandSlug: string | undefined) {
  const mock = isMockDataEnabled();
  const key = mock || !brandSlug ? null : catalogIpsKey(brandSlug);

  const { data, loading } = useCachedFetch(
    key,
    () => getCatalogIps(brandSlug!).catch(() => [] as IpRow[]),
    [brandSlug],
    { enabled: !mock && !!brandSlug, initial: [] as IpRow[] }
  );

  if (mock || !brandSlug) {
    return { ips: [] as IpRow[], loading: false };
  }

  return { ips: data ?? [], loading };
}

/** @deprecated 請改用 useCatalogIps；保留別名以免大量改動 */
export function useCatalogSeries(brandSlug: string | undefined) {
  const { ips, loading } = useCatalogIps(brandSlug);
  return { series: ips as SeriesRow[], loading };
}

/** 產品線系列（DB `series`，可選 IP slug 篩選） */
export function useCatalogProductSeries(
  brandSlug: string | undefined,
  ipSlug?: string
) {
  const mock = isMockDataEnabled();
  const key =
    mock || !brandSlug ? null : catalogProductSeriesKey(brandSlug, ipSlug);

  const { data, loading } = useCachedFetch(
    key,
    () => getCatalogSeries(brandSlug!, ipSlug).catch(() => [] as SeriesRow[]),
    [brandSlug, ipSlug],
    { enabled: !mock && !!brandSlug, initial: [] as SeriesRow[] }
  );

  if (mock || !brandSlug) {
    return { productSeries: [] as SeriesRow[], loading: false };
  }

  return { productSeries: data ?? [], loading };
}

export function useCatalogStyles(
  brandSlug: string | undefined,
  seriesSlug: string | undefined,
  ipSlug: string | undefined
) {
  const mock = isMockDataEnabled();
  const key =
    mock || !brandSlug || !seriesSlug || !ipSlug
      ? null
      : catalogStylesKey(brandSlug, seriesSlug, ipSlug);

  const { data, loading } = useCachedFetch(
    key,
    () =>
      getCatalogStyles(brandSlug!, seriesSlug!, ipSlug!).catch(() => [] as StyleRow[]),
    [brandSlug, seriesSlug, ipSlug],
    {
      enabled: !mock && !!brandSlug && !!seriesSlug && !!ipSlug,
      initial: [] as StyleRow[] },
  );

  if (mock || !brandSlug || !seriesSlug || !ipSlug) {
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
