import type { CatalogProduct } from '@/frontend/domain/entities/catalog';

/** 從商品標題擷取「××系列」作為圖鑑商品線名稱 */
export function deriveCatalogSeriesName(title: string): string {
  const cleaned = title
    .replace(/^泡泡萌粒\s*/g, '')
    .replace(/(手辦|公仔|手办|盲盒|模型|挂件|掛件|周邊|周边)$/g, '')
    .trim();
  const m = cleaned.match(/([A-Za-z0-9\u4e00-\u9fff ×xX·\-\(\)（）]{2,32}?系列)/);
  return m?.[1]?.trim() ?? '未分系列';
}

export function catalogProductLineKey(product: CatalogProduct): string {
  return deriveCatalogSeriesName(product.title);
}

export function filterProductsByIp(products: CatalogProduct[], ipName: string): CatalogProduct[] {
  if (!ipName) return [];
  return products.filter((p) => (p.seriesName ?? '') === ipName);
}

export function productLinesFromProducts(products: CatalogProduct[]): string[] {
  const counts = new Map<string, number>();
  for (const p of products) {
    const line = catalogProductLineKey(p);
    counts.set(line, (counts.get(line) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name);
}

export function productsInLine(products: CatalogProduct[], line: string): CatalogProduct[] {
  return products.filter((p) => catalogProductLineKey(p) === line);
}
