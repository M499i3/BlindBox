/** 官網圖鑑／展示用商品（Catalog） */
export type CatalogProduct = {
  id: string;
  title: string;
  price: string;
  image: string;
  sourceUrl: string;
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
};
