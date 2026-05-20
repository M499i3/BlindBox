import type {
  BrandRow,
  CatalogProduct,
  CatalogShowcase,
} from '@/frontend/domain/entities/catalog';
import type { CatalogLoadMeta } from '@/frontend/domain/entities/catalogLoad';
import type { ICatalogRepository } from '@/frontend/domain/repositories/ICatalogRepository';

export class CatalogService {
  constructor(private readonly catalogRepo: ICatalogRepository) {}

  getShowcase(): CatalogShowcase {
    return this.catalogRepo.getShowcase();
  }

  getLoadMeta(): CatalogLoadMeta {
    return this.catalogRepo.getLoadMeta();
  }

  getProductById(id: string): CatalogProduct | undefined {
    return this.catalogRepo.getProductById(id);
  }

  searchProducts(query: string): CatalogProduct[] {
    const q = query.trim().toLowerCase();
    const products = this.getShowcase().products;
    if (!q) return products;
    return products.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        this.deriveBrandLabel(p.title).toLowerCase().includes(q)
    );
  }

  productsByBrandSlug(slug: string): CatalogProduct[] {
    const raw = decodeURIComponent(slug).replace(/\+/g, ' ').trim();
    const s = raw.toLowerCase().replace(/-/g, ' ');
    const products = this.getShowcase().products;
    const list = products.filter((p) => {
      const b = this.deriveBrandLabel(p.title).toLowerCase();
      const t = p.title.toLowerCase();
      return (
        b === s ||
        b.replace(/\s+/g, '') === s.replace(/\s+/g, '') ||
        t.includes(s) ||
        s.includes(b.replace(/\s+/g, ''))
      );
    });
    return list.length ? list : products.slice(0, 12);
  }

  deriveBrandLabel(title: string): string {
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

  buildBrandRow(products: CatalogProduct[], max = 4): BrandRow[] {
    const map = new Map<string, string>();
    for (const p of products) {
      const name = this.deriveBrandLabel(p.title);
      if (!map.has(name)) map.set(name, p.image);
      if (map.size >= max) break;
    }
    return [...map.entries()].map(([name, image]) => ({ name, image }));
  }

  getDefaultProductImage(): string {
    const products = this.getShowcase().products;
    return (
      products[0]?.image ??
      'https://global-static.popmart.com/globalAdmin/1776844373939____pc____.jpg?x-oss-process=image/resize,w_800/quality,q_85/format,webp'
    );
  }
}
