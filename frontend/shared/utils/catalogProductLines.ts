import type { CatalogProduct } from '@/frontend/domain/entities/catalog';
import { resolveHierarchyLabels } from '@/frontend/shared/utils/catalogHierarchy';
import { deriveSeriesName as deriveCatalogSeriesName } from '@/frontend/shared/utils/deriveSeriesName';

export { deriveCatalogSeriesName };

export function catalogProductLineKey(product: CatalogProduct): string {
  if (product.seriesName) return product.seriesName;
  return deriveCatalogSeriesName(product.title);
}

function deriveIpFromProduct(p: CatalogProduct): string {
  return resolveHierarchyLabels(p).ip;
}

export function filterProductsByIp(products: CatalogProduct[], ipName: string): CatalogProduct[] {
  if (!ipName) return [];
  return products.filter((p) => deriveIpFromProduct(p) === ipName);
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
