/** Supabase 查詢列型別（對應 initial_schema.sql） */

export type DbBrand = {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
};

export type DbSeries = {
  id: string;
  brand_id: string;
  slug: string;
  name: string;
  cover_url: string | null;
};

export type DbCatalogProduct = {
  id: string;
  external_id: string | null;
  series_id: string | null;
  title: string;
  official_price_amount: number | null;
  official_price_currency: string | null;
  image_url: string | null;
  source_url: string | null;
  is_secret: boolean;
  updated_at?: string;
};

export type DbUser = {
  id: string;
  display_id: number;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
};

export type DbListingImage = {
  id: string;
  listing_id: string;
  url: string;
  sort_order: number;
};

export type ListingConditionDb = 'sealed' | 'opened' | 'displayed';
export type TradeModeDb = 'sell' | 'swap' | 'group_buy';
export type ShippingMethodDb = '711_store' | 'family_store' | 'in_person' | 'post_office';
export type ListingStatusDb = 'draft' | 'active' | 'reserved' | 'sold' | 'removed';

export type DbListing = {
  id: string;
  seller_id: string;
  catalog_product_id: string | null;
  brand_id: string | null;
  series_id: string | null;
  title: string;
  item_name: string;
  description: string | null;
  price_amount: number;
  price_currency: string;
  condition: ListingConditionDb;
  trade_mode: TradeModeDb;
  shipping_method: ShippingMethodDb;
  allow_swap: boolean;
  allow_bargain: boolean;
  status: ListingStatusDb;
  created_at: string;
  users?: { display_name: string } | { display_name: string }[] | null;
  brands?: { name: string } | { name: string }[] | null;
  series?: { name: string } | { name: string }[] | null;
  listing_images?: DbListingImage[];
};

export type DbCartItem = {
  id: string;
  user_id: string;
  listing_id: string;
};
