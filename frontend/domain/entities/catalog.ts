/** 官網圖鑑／展示用商品（Catalog） */
export type CatalogProduct = {
  id: string;
  title: string;
  /** Display price (NT$ after TW MSRP mapping) */
  price: string;
  /** Original HK scrape price, when mapped from HK tiers */
  priceHkd?: string;
  image: string;
  sourceUrl: string;
  /** Explicit IP from KOCA scrape or manual mapping */
  ip?: string;
  ipSlug?: string;
  typeId?: string | null;
  artistName?: string | null;
  numOfSeller?: number;
  numOfCollected?: number;
  isSecret?: boolean;
  marketPrice?: {
    currency: string;
    listingCount: number;
    min: number;
    max: number;
    avg: number;
    median: number;
  } | null;
  alsoInIps?: string[];
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
  currency?: string;
  priceMapping?: {
    mappedAt: string;
    note?: string;
    hkToNtd: Record<string, number>;
  };
  banners: CatalogBanner[];
  products: CatalogProduct[];
};

export type BrandRow = {
  name: string;
  image: string;
};
