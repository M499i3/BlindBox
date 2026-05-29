import type { BrandRow, CatalogProduct, CatalogShowcase } from '@/frontend/domain/entities/catalog';
import showcaseJson from '@/frontend/data/popmart-hk-showcase.json';

export const popmartShowcase = showcaseJson as CatalogShowcase;

export function isMockDataEnabled(): boolean {
  return import.meta.env.VITE_USE_MOCK_DATA === 'true';
}

export function deriveBrandLabel(title: string): string {
  const u = title.toUpperCase();
  if (u.includes('SKULLPANDA')) return 'SKULLPANDA';
  if (u.includes('PUCKY')) return 'PUCKY';
  if (u.includes('DIMOO')) return 'Dimoo';
  if (u.includes('MOLLY')) return 'Molly';
  if (u.includes('LABUBU')) return 'LABUBU';
  if (u.includes('CHAKA')) return 'CHAKA';
  if (title.includes('泡泡')) return 'Pop Mart';
  return 'Pop Mart';
}

export function buildBrandRow(products: CatalogProduct[], max = 4): BrandRow[] {
  const map = new Map<string, string>();
  for (const p of products) {
    const name = deriveBrandLabel(p.title);
    if (!map.has(name)) map.set(name, p.image);
    if (map.size >= max) break;
  }
  return [...map.entries()].map(([name, image]) => ({ name, image }));
}

export function getProductById(id: string): CatalogProduct | undefined {
  return popmartShowcase.products.find((p) => p.id === id);
}

export function searchProducts(query: string): CatalogProduct[] {
  const q = query.trim().toLowerCase();
  if (!q) return popmartShowcase.products;
  return popmartShowcase.products.filter(
    (p) =>
      p.title.toLowerCase().includes(q) ||
      deriveBrandLabel(p.title).toLowerCase().includes(q)
  );
}

export function productsByBrandSlug(slug: string): CatalogProduct[] {
  const raw = decodeURIComponent(slug).replace(/\+/g, ' ').trim();
  const s = raw.toLowerCase().replace(/-/g, ' ');
  const list = popmartShowcase.products.filter((p) => {
    const b = deriveBrandLabel(p.title).toLowerCase();
    const t = p.title.toLowerCase();
    return (
      b === s ||
      b.replace(/\s+/g, '') === s.replace(/\s+/g, '') ||
      t.includes(s) ||
      s.includes(b.replace(/\s+/g, ''))
    );
  });
  return list.length ? list : popmartShowcase.products.slice(0, 12);
}

export function filterMockProducts(opts?: { q?: string; brand?: string }): CatalogProduct[] {
  let list = popmartShowcase.products;
  if (opts?.q) list = searchProducts(opts.q);
  if (opts?.brand) {
    const b = opts.brand.toLowerCase();
    list = list.filter((p) => deriveBrandLabel(p.title).toLowerCase().includes(b));
  }
  return list;
}

export function getMockBrands(limit = 6): BrandRow[] {
  return buildBrandRow(popmartShowcase.products, limit);
}
