import { useEffect, useMemo, useState } from 'react';
import type { BrandRow, CatalogProduct } from '@/frontend/domain/entities/catalog';
import {
  getCatalogBrands,
  getCatalogProducts,
  getCatalogProductById,
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
} from '@/frontend/lib/popmartShowcase';

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

let _cache: CatalogProduct[] | null = null;

export function useCatalogProducts(opts?: {
  q?: string;
  brand?: string;
  series?: string;
  /** API mode: skip fetch when false (avoids loading full catalog). */
  enabled?: boolean;
}) {
  const mock = isMockDataEnabled();
  const enabled = opts?.enabled !== false;
  const hasFilter = Boolean(opts?.q || opts?.brand || opts?.series);
  const mockProducts = useMemo(
    () => (mock ? filterMockProducts(opts) : []),
    [mock, opts?.q, opts?.brand, opts?.series]
  );

  const [products, setProducts] = useState<CatalogProduct[]>(mock ? mockProducts : _cache ?? []);
  const [loading, setLoading] = useState(!mock && enabled && !_cache && !hasFilter);

  useEffect(() => {
    if (!enabled && !mock) {
      setProducts([]);
      setLoading(false);
      return;
    }
    if (mock) {
      setProducts(mockProducts);
      setLoading(false);
      return;
    }
    if (_cache && !hasFilter) {
      setProducts(_cache);
      setLoading(false);
      return;
    }
    setLoading(true);
    getCatalogProducts(opts)
      .then((ps) => {
        if (!hasFilter) _cache = ps;
        setProducts(ps);
      })
      .catch(() => {
        const fallback = filterMockProducts(opts);
        if (!hasFilter) _cache = fallback;
        setProducts(fallback);
      })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mock, mockProducts, enabled, opts?.q, opts?.brand, opts?.series, hasFilter]);

  return { products, loading };
}

export function useCatalogProduct(id: string | undefined) {
  const mock = isMockDataEnabled();
  const mockProduct = useMemo(
    () => (mock && id ? getProductById(id) ?? null : null),
    [mock, id]
  );

  const [product, setProduct] = useState<CatalogProduct | null>(mock ? mockProduct : null);
  const [loading, setLoading] = useState(!mock && !!id);

  useEffect(() => {
    if (!id) return;
    if (mock) {
      setProduct(getProductById(id) ?? null);
      setLoading(false);
      return;
    }
    if (_cache) {
      const found = _cache.find((p) => p.id === id);
      if (found) {
        setProduct(found);
        setLoading(false);
        return;
      }
    }
    setLoading(true);
    getCatalogProductById(id)
      .then(setProduct)
      .catch(() => setProduct(getProductById(id) ?? null))
      .finally(() => setLoading(false));
  }, [mock, id]);

  return { product, loading };
}

export function useCatalogBrands() {
  const mock = isMockDataEnabled();
  const [brands, setBrands] = useState<BrandRow[]>(mock ? getMockBrands() : []);

  useEffect(() => {
    if (mock) {
      setBrands(getMockBrands());
      return;
    }
    getCatalogBrands()
      .then(setBrands)
      .catch(() => setBrands(getMockBrands()));
  }, [mock]);

  return brands;
}

export function useCatalogSeries(brandSlug: string | undefined) {
  const mock = isMockDataEnabled();
  const [series, setSeries] = useState<SeriesRow[]>([]);
  const [loading, setLoading] = useState(!mock && !!brandSlug);

  useEffect(() => {
    if (!brandSlug) {
      setSeries([]);
      setLoading(false);
      return;
    }
    if (mock) {
      setSeries([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    getCatalogSeries(brandSlug)
      .then(setSeries)
      .catch(() => setSeries([]))
      .finally(() => setLoading(false));
  }, [mock, brandSlug]);

  return { series, loading };
}

export function useCatalogStyles(brandSlug: string | undefined, seriesSlug: string | undefined) {
  const mock = isMockDataEnabled();
  const [styles, setStyles] = useState<StyleRow[]>([]);
  const [loading, setLoading] = useState(!mock && !!brandSlug && !!seriesSlug);

  useEffect(() => {
    if (!brandSlug || !seriesSlug) {
      setStyles([]);
      setLoading(false);
      return;
    }
    if (mock) {
      setStyles([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    getCatalogStyles(brandSlug, seriesSlug)
      .then(setStyles)
      .catch(() => setStyles([]))
      .finally(() => setLoading(false));
  }, [mock, brandSlug, seriesSlug]);

  return { styles, loading };
}
