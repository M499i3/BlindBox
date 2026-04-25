import showcaseJson from '@/src/data/popmart-hk-showcase.json';

export type ShowcaseProduct = {
  id: string;
  title: string;
  price: string;
  image: string;
  sourceUrl: string;
};

export type PopmartShowcase = {
  scrapedAt: string;
  sourceUrl: string;
  jinaReader: string;
  banners: { id: string; image: string; sourceUrl: string }[];
  products: ShowcaseProduct[];
};

export const popmartShowcase = showcaseJson as PopmartShowcase;

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

/** First distinct IP rows for Explore “熱門品牌”. */
export function buildBrandRow(products: ShowcaseProduct[], max = 4) {
  const map = new Map<string, string>();
  for (const p of products) {
    const name = deriveBrandLabel(p.title);
    if (!map.has(name)) map.set(name, p.image);
    if (map.size >= max) break;
  }
  return [...map.entries()].map(([name, image]) => ({ name, image }));
}

export function getProductById(id: string) {
  return popmartShowcase.products.find((p) => p.id === id);
}

export function searchProducts(query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return popmartShowcase.products;
  return popmartShowcase.products.filter(
    (p) =>
      p.title.toLowerCase().includes(q) ||
      deriveBrandLabel(p.title).toLowerCase().includes(q)
  );
}

/** Match brand explore slug to scraped products (fuzzy). */
export function productsByBrandSlug(slug: string) {
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
