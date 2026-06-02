/** 官網圖鑑／展示用商品（Catalog） */
export type CatalogProduct = {
  id: string;
  title: string;
  price: string;
  image: string;
  sourceUrl: string;
  brandSlug?: string;
  brandName?: string;
  seriesSlug?: string;
  seriesName?: string;
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

export type SeriesRow = {
  id: string;
  slug: string;
  name: string;
  image?: string;
  count?: number;
  brandSlug?: string;
  brandName?: string;
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
