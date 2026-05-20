import { useCallback, useEffect, useMemo, useState } from 'react';
import type { BrandRow, CatalogProduct } from '@/frontend/domain/entities/catalog';
import { getCatalogBrands, getCatalogProducts, getCatalogProductById } from '@/frontend/infrastructure/api/catalogApi';

const _BRAND_RULES: [string, string][] = [
  ['SKULLPANDA', 'SKULLPANDA'],
  ['PUCKY', 'PUCKY'],
  ['DIMOO', 'Dimoo'],
  ['MOLLY', 'Molly'],
  ['LABUBU', 'LABUBU'],
  ['CHAKA', 'CHAKA'],
];

export function deriveBrandLabel(title: string): string {
  const u = title.toUpperCase();
  for (const [kw, label] of _BRAND_RULES) {
    if (u.includes(kw)) return label;
  }
  return 'Pop Mart';
}

export function buildBrandRow(products: CatalogProduct[], limit = 6): BrandRow[] {
  const seen = new Map<string, string>();
  for (const p of products) {
    const name = deriveBrandLabel(p.title);
    if (!seen.has(name)) seen.set(name, p.image);
    if (seen.size >= limit) break;
  }
  return Array.from(seen, ([name, image]) => ({ name, image }));
}

/** 全量圖鑑（首次載入後快取） */
let _cache: CatalogProduct[] | null = null;

export function useCatalogProducts(opts?: { q?: string; brand?: string }) {
  const [products, setProducts] = useState<CatalogProduct[]>(_cache ?? []);
  const [loading, setLoading] = useState(!_cache);

  useEffect(() => {
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
      .catch(console.error)
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts?.q, opts?.brand]);

  return { products, loading };
}

export function useCatalogProduct(id: string | undefined) {
  const [product, setProduct] = useState<CatalogProduct | null>(null);
  const [loading, setLoading] = useState(!!id);

  useEffect(() => {
    if (!id) return;
    // Check cache first
    if (_cache) {
      const found = _cache.find((p) => p.id === id);
      if (found) { setProduct(found); setLoading(false); return; }
    }
    setLoading(true);
    getCatalogProductById(id)
      .then(setProduct)
      .catch(() => setProduct(null))
      .finally(() => setLoading(false));
  }, [id]);

  return { product, loading };
}

export function useCatalogBrands() {
  const [brands, setBrands] = useState<BrandRow[]>([]);
  useEffect(() => {
    getCatalogBrands().then(setBrands).catch(console.error);
  }, []);
  return brands;
}
