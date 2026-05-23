import { useEffect, useMemo, useState } from 'react';
import type { BrandRow, CatalogProduct } from '@/frontend/domain/entities/catalog';
import { getCatalogBrands, getCatalogProducts, getCatalogProductById } from '@/frontend/infrastructure/api/catalogApi';
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

export function useCatalogProducts(opts?: { q?: string; brand?: string }) {
  const mock = isMockDataEnabled();
  const mockProducts = useMemo(
    () => (mock ? filterMockProducts(opts) : []),
    [mock, opts?.q, opts?.brand]
  );

  const [products, setProducts] = useState<CatalogProduct[]>(mock ? mockProducts : _cache ?? []);
  const [loading, setLoading] = useState(!mock && !_cache);

  useEffect(() => {
    if (mock) {
      setProducts(mockProducts);
      setLoading(false);
      return;
    }
    if (_cache && !opts?.q && !opts?.brand) {
      setProducts(_cache);
      setLoading(false);
      return;
    }
    setLoading(true);
    getCatalogProducts(opts)
      .then((ps) => {
        if (!opts?.q && !opts?.brand) _cache = ps;
        setProducts(ps);
      })
      .catch(() => {
        const fallback = filterMockProducts(opts);
        if (!opts?.q && !opts?.brand) _cache = fallback;
        setProducts(fallback);
      })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mock, mockProducts, opts?.q, opts?.brand]);

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
