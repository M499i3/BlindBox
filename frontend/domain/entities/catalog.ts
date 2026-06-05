/** 官網圖鑑／展示用商品（Catalog） */
export type CatalogProduct = {
  id: string;
  title: string;
  price: string;
  image: string;
  sourceUrl: string;
  brandSlug?: string;
  brandName?: string;
  ipSlug?: string;
  ipName?: string;
  seriesSlug?: string;
  seriesName?: string;
  // price history stats
  lastTradedPrice?: number | null;
  lastTradedAt?: string | null;
  prevTradedPrice?: number | null;
  price90dMin?: number | null;
  price90dMax?: number | null;
  price90dCount?: number;
};

export type CatalogBanner = {
  id: string;
  image: string;
  sourceUrl: string;
};

export type CatalogShowcase = {
  scrapedAt: string;
  sourceUrl: string;
  jinaReader: string;
  extraSources?: string[];
  ipHints?: string[];
  banners: CatalogBanner[];
  products: CatalogProduct[];
};

export type BrandRow = {
  name: string;
  image: string;
  slug?: string;
};

export type IpRow = {
  id: string;
  slug: string;
  name: string;
  image?: string;
  count?: number;
};

export type SeriesRow = {
  id: string;
  slug: string;
  name: string;
  image?: string;
  count?: number;
  brandSlug?: string;
  brandName?: string;
  ipSlug?: string;
  ipName?: string;
};

export type CatalogSearchResult = {
  brands: BrandRow[];
  series: SeriesRow[];
  products: CatalogProduct[];
};

export type StyleRow = {
  id: string;
  name: string;
  image: string;
};
