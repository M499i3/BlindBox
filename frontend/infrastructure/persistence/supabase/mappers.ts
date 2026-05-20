import type { CatalogProduct, CatalogShowcase } from '@/frontend/domain/entities/catalog';
import type { CreateListingInput, Listing } from '@/frontend/domain/entities/listing';
import type { UserProfile } from '@/frontend/domain/entities/profile';
import type {
  DbCatalogProduct,
  DbListing,
  DbUser,
  ListingConditionDb,
  ShippingMethodDb,
  TradeModeDb,
} from '@/frontend/infrastructure/persistence/supabase/dbTypes';

const CONDITION_TO_UI: Record<ListingConditionDb, string> = {
  sealed: '全新未拆',
  opened: '已拆盒',
  displayed: '展示過',
};

const CONDITION_FROM_UI: Record<string, ListingConditionDb> = {
  全新未拆: 'sealed',
  已拆盒: 'opened',
  展示過: 'displayed',
};

const TRADE_TO_UI: Record<TradeModeDb, string> = {
  sell: '我要賣',
  swap: '我想換',
  group_buy: '加入拆盒團',
};

const TRADE_FROM_UI: Record<string, TradeModeDb> = {
  我要賣: 'sell',
  我想換: 'swap',
  加入拆盒團: 'group_buy',
};

const SHIPPING_TO_UI: Record<ShippingMethodDb, string> = {
  '711_store': '7-11 店到店',
  family_store: '全家 店到店',
  in_person: '面交',
  post_office: '郵局包裹',
};

const SHIPPING_FROM_UI: Record<string, ShippingMethodDb> = {
  '7-11 店到店': '711_store',
  '全家 店到店': 'family_store',
  面交: 'in_person',
  郵局包裹: 'post_office',
};

const DEFAULT_IMAGE =
  'https://global-static.popmart.com/globalAdmin/1776844373939____pc____.jpg?x-oss-process=image/resize,w_800/quality,q_85/format,webp';

export function formatMoney(amountMinor: number, currency: string): string {
  const major = amountMinor / 100;
  const formatted =
    currency === 'HKD'
      ? major.toFixed(2)
      : Number.isInteger(major)
        ? String(major)
        : major.toFixed(0);
  const symbol =
    currency === 'HKD' ? 'HK$' : currency === 'CNY' ? '¥' : 'NT$';
  return `${symbol} ${formatted}`;
}

export function parsePriceToMinor(price: string, defaultCurrency = 'TWD'): {
  amount: number;
  currency: string;
} {
  const digits = price.replace(/[^\d.]/g, '');
  const major = Number(digits);
  if (!Number.isFinite(major) || major <= 0) {
    return { amount: 0, currency: defaultCurrency };
  }
  let currency = defaultCurrency;
  if (/HK\$|HKD/i.test(price)) currency = 'HKD';
  else if (/¥|CNY/i.test(price)) currency = 'CNY';
  return { amount: Math.round(major * 100), currency };
}

export function catalogProductFromRow(row: DbCatalogProduct): CatalogProduct {
  const id = row.external_id ?? row.id;
  const amount = row.official_price_amount ?? 0;
  const currency = row.official_price_currency ?? 'HKD';
  return {
    id,
    title: row.title,
    price: amount > 0 ? formatMoney(amount, currency) : 'HK$ 0.00',
    image: row.image_url ?? DEFAULT_IMAGE,
    sourceUrl: row.source_url ?? '',
  };
}

export function showcaseFromProducts(
  products: CatalogProduct[],
  meta?: Partial<CatalogShowcase>
): CatalogShowcase {
  const banners =
    meta?.banners ??
    products.slice(0, 4).map((p) => ({
      id: p.id,
      image: p.image,
      sourceUrl: p.sourceUrl,
    }));
  return {
    scrapedAt: meta?.scrapedAt ?? new Date().toISOString(),
    sourceUrl: meta?.sourceUrl ?? 'https://www.popmart.com/hk',
    jinaReader: meta?.jinaReader ?? '',
    extraSources: meta?.extraSources,
    ipHints: meta?.ipHints,
    banners,
    products,
  };
}

function relationField<T extends Record<string, unknown>>(
  rel: T | T[] | null | undefined,
  key: keyof T
): string | undefined {
  if (!rel) return undefined;
  const item = Array.isArray(rel) ? rel[0] : rel;
  const value = item?.[key];
  return typeof value === 'string' ? value : undefined;
}

export function listingFromRow(row: DbListing): Listing {
  const images = [...(row.listing_images ?? [])].sort(
    (a, b) => a.sort_order - b.sort_order
  );
  const image = images[0]?.url ?? DEFAULT_IMAGE;
  return {
    id: row.id,
    title: row.title,
    itemName: row.item_name,
    price: formatMoney(row.price_amount, row.price_currency),
    description: row.description ?? '',
    brand: relationField(row.brands, 'name') ?? 'Pop Mart',
    series: relationField(row.series, 'name') ?? row.item_name,
    condition: CONDITION_TO_UI[row.condition] ?? row.condition,
    tradeMode: TRADE_TO_UI[row.trade_mode] ?? row.trade_mode,
    shipping: SHIPPING_TO_UI[row.shipping_method] ?? row.shipping_method,
    allowSwap: row.allow_swap,
    allowBargain: row.allow_bargain,
    image,
    createdAt: row.created_at,
    sellerName: relationField(row.users, 'display_name') ?? 'Seller',
  };
}

export function listingToInsert(
  input: CreateListingInput,
  sellerId: string
): Record<string, unknown> {
  const { amount, currency } = parsePriceToMinor(input.price);
  return {
    seller_id: sellerId,
    title: input.title,
    item_name: input.itemName,
    description: input.description,
    price_amount: amount,
    price_currency: currency,
    condition: CONDITION_FROM_UI[input.condition] ?? 'sealed',
    trade_mode: TRADE_FROM_UI[input.tradeMode] ?? 'sell',
    shipping_method: SHIPPING_FROM_UI[input.shipping] ?? '711_store',
    allow_swap: input.allowSwap,
    allow_bargain: input.allowBargain,
    status: 'active',
  };
}

export function profileFromUser(row: DbUser): UserProfile {
  return {
    displayName: row.display_name,
    avatarDataUrl: row.avatar_url,
    bio: row.bio ?? '',
  };
}

export function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

export function primaryListingImage(input: CreateListingInput): string | null {
  if (isHttpUrl(input.image)) return input.image;
  return null;
}
