import type { CatalogProduct } from '@/frontend/domain/entities/catalog';
import { deriveBrandLabel, FALLBACK_IP } from '@/frontend/shared/utils/deriveIp';

/** 圖鑑層級：品牌 → IP → 系列 → 盲盒商品 */
export type CollectionProgress = {
  collected: number;
  total: number;
};

export type BrandNode = {
  kind: 'brand';
  id: string;
  name: string;
  image?: string;
  progress: CollectionProgress;
};

export type IpNode = {
  kind: 'ip';
  id: string;
  brand: string;
  name: string;
  image?: string;
  progress: CollectionProgress;
};

export type SeriesNode = {
  kind: 'series';
  id: string;
  brand: string;
  ip: string;
  name: string;
  image?: string;
  progress: CollectionProgress;
};

export type ProductLeaf = {
  kind: 'product';
  id: string;
  brand: string;
  ip: string;
  series: string;
  title: string;
  image: string;
  price: string;
  collected: boolean;
};

export type CatalogHierarchy = {
  brands: BrandNode[];
  ipsByBrand: Record<string, IpNode[]>;
  seriesByBrandIp: Record<string, SeriesNode[]>;
  productsByBrandIpSeries: Record<string, ProductLeaf[]>;
};

const POP_MART = 'Pop Mart';
const JELLYCAT = 'Jellycat';
const FALLBACK_SERIES = '未分系列';

export function deriveSeriesName(title: string): string {
  const cleaned = title
    .replace(/^泡泡萌粒\s*/g, '')
    .replace(/(手辦|公仔|手办|盲盒|模型|挂件|掛件|周邊|周边)$/g, '')
    .trim();
  const m = cleaned.match(/([A-Za-z0-9\u4e00-\u9fff ×xX·\-\(\)（）]{2,32}?系列)/);
  return m?.[1]?.trim() ?? FALLBACK_SERIES;
}

export function productBrandName(title: string): string {
  if (/jellycat/i.test(title)) return JELLYCAT;
  return POP_MART;
}

export function productIpName(title: string, brand: string): string {
  if (brand !== POP_MART) return brand;
  return deriveBrandLabel(title);
}

function seriesKey(brand: string, ip: string, series: string) {
  return `${brand}::${ip}::${series}`;
}

function progress(collected: number, total: number): CollectionProgress {
  return { collected, total };
}

function countCollected(productIds: string[], ownedSet: Set<string>) {
  return productIds.filter((id) => ownedSet.has(id)).length;
}

export type BuildCatalogHierarchyOptions = {
  /** 僅保留至少有一件已收藏的節點；商品層只顯示已收藏盲盒 */
  onlyCollected?: boolean;
};

function filterCollectedHierarchy(hierarchy: CatalogHierarchy): CatalogHierarchy {
  const productsByBrandIpSeries: Record<string, ProductLeaf[]> = {};
  for (const [sk, leaves] of Object.entries(hierarchy.productsByBrandIpSeries)) {
    const collected = leaves.filter((l) => l.collected);
    if (collected.length) productsByBrandIpSeries[sk] = collected;
  }

  const seriesByBrandIp: Record<string, SeriesNode[]> = {};
  for (const [key, nodes] of Object.entries(hierarchy.seriesByBrandIp)) {
    const filtered = nodes.filter((n) => n.progress.collected > 0);
    if (filtered.length) seriesByBrandIp[key] = filtered;
  }

  const ipsByBrand: Record<string, IpNode[]> = {};
  for (const [brand, nodes] of Object.entries(hierarchy.ipsByBrand)) {
    const filtered = nodes.filter((n) => n.progress.collected > 0);
    if (filtered.length) ipsByBrand[brand] = filtered;
  }

  const brands = hierarchy.brands.filter((b) => b.progress.collected > 0);

  return { brands, ipsByBrand, seriesByBrandIp, productsByBrandIpSeries };
}

/**
 * 由全圖鑑商品建立四層樹狀結構，並依 ownedProductIds 計算各層收集比例。
 */
export function buildCatalogHierarchy(
  products: CatalogProduct[],
  ownedProductIds: string[],
  options?: BuildCatalogHierarchyOptions
): CatalogHierarchy {
  const ownedSet = new Set(ownedProductIds);

  type Acc = {
    brand: string;
    ip: string;
    series: string;
    product: CatalogProduct;
  };

  const rows: Acc[] = products.map((p) => {
    const brand = productBrandName(p.title);
    const ip = productIpName(p.title, brand);
    const series = deriveSeriesName(p.title);
    return { brand, ip, series, product: p };
  });

  const brandMap = new Map<string, { image?: string; productIds: string[] }>();
  const ipMap = new Map<string, { brand: string; name: string; image?: string; productIds: string[] }>();
  const seriesMap = new Map<
    string,
    { brand: string; ip: string; name: string; image?: string; productIds: string[] }
  >();
  const productMap = new Map<string, ProductLeaf[]>();

  for (const row of rows) {
    const { brand, ip, series, product } = row;
    const sk = seriesKey(brand, ip, series);

    if (!brandMap.has(brand)) brandMap.set(brand, { image: product.image, productIds: [] });
    brandMap.get(brand)!.productIds.push(product.id);

    const ipKey = `${brand}::${ip}`;
    if (!ipMap.has(ipKey)) ipMap.set(ipKey, { brand, name: ip, image: product.image, productIds: [] });
    ipMap.get(ipKey)!.productIds.push(product.id);

    if (!seriesMap.has(sk)) {
      seriesMap.set(sk, { brand, ip, name: series, image: product.image, productIds: [] });
    }
    seriesMap.get(sk)!.productIds.push(product.id);

    const leaf: ProductLeaf = {
      kind: 'product',
      id: product.id,
      brand,
      ip,
      series,
      title: product.title,
      image: product.image,
      price: product.price,
      collected: ownedSet.has(product.id),
    };
    if (!productMap.has(sk)) productMap.set(sk, []);
    productMap.get(sk)!.push(leaf);
  }

  const brands: BrandNode[] = Array.from(brandMap.entries())
    .map(([name, meta]) => ({
      kind: 'brand' as const,
      id: name,
      name,
      image: meta.image,
      progress: progress(countCollected(meta.productIds, ownedSet), meta.productIds.length),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'zh-Hant'));

  const ipsByBrand: Record<string, IpNode[]> = {};
  for (const [, meta] of ipMap) {
    if (!ipsByBrand[meta.brand]) ipsByBrand[meta.brand] = [];
    ipsByBrand[meta.brand].push({
      kind: 'ip',
      id: meta.name,
      brand: meta.brand,
      name: meta.name,
      image: meta.image,
      progress: progress(countCollected(meta.productIds, ownedSet), meta.productIds.length),
    });
  }
  for (const brand of Object.keys(ipsByBrand)) {
    ipsByBrand[brand].sort((a, b) => b.progress.total - a.progress.total);
  }

  const seriesByBrandIp: Record<string, SeriesNode[]> = {};
  for (const [, meta] of seriesMap) {
    const key = `${meta.brand}::${meta.ip}`;
    if (!seriesByBrandIp[key]) seriesByBrandIp[key] = [];
    seriesByBrandIp[key].push({
      kind: 'series',
      id: meta.name,
      brand: meta.brand,
      ip: meta.ip,
      name: meta.name,
      image: meta.image,
      progress: progress(countCollected(meta.productIds, ownedSet), meta.productIds.length),
    });
  }
  for (const k of Object.keys(seriesByBrandIp)) {
    seriesByBrandIp[k].sort((a, b) => b.progress.total - a.progress.total);
  }

  const hierarchy: CatalogHierarchy = {
    brands,
    ipsByBrand,
    seriesByBrandIp,
    productsByBrandIpSeries: Object.fromEntries(productMap),
  };

  return options?.onlyCollected ? filterCollectedHierarchy(hierarchy) : hierarchy;
}

export function formatProgress(p: CollectionProgress): string {
  return `${p.collected}/${p.total}`;
}
