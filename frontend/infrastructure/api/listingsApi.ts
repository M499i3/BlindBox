import type { CreateListingInput, Listing } from '../../domain/entities/listing';
import { coerceShippingMethods } from '../../shared/utils/listingShipping';
import { apiFetch } from './apiClient';

/** snake_case shape returned by the FastAPI backend */
type ApiListing = {
  id: string;
  title: string;
  item_name: string;
  price: string;
  description: string;
  brand: string;
  series: string;
  condition: string;
  trade_mode: string;
  shipping: string;
  shipping_methods?: string[];
  allow_swap: boolean;
  allow_bargain: boolean;
  image: string;
  images?: string[];
  created_at: string;
  seller_name: string;
  seller_id?: string;
  split_box_group_id?: string | null;
  split_box_slot_id?: string | null;
  quantity: number;
};

function toFrontend(l: ApiListing): Listing {
  const images = l.images?.filter(Boolean) ?? [];
  return {
    id: l.id,
    title: l.title,
    itemName: l.item_name,
    price: l.price,
    description: l.description,
    brand: l.brand,
    series: l.series,
    condition: l.condition,
    tradeMode: l.trade_mode,
    shipping: l.shipping,
    shippingMethods: (() => {
      const methods = coerceShippingMethods(l.shipping_methods);
      return methods.length ? methods : undefined;
    })(),
    allowSwap: l.allow_swap,
    allowBargain: l.allow_bargain,
    image: l.image || images[0] || '',
    images,
    createdAt: l.created_at,
    sellerName: l.seller_name,
    quantity: l.quantity ?? 1,
    sellerId: l.seller_id,
    splitBoxGroupId: l.split_box_group_id ?? null,
    splitBoxSlotId: l.split_box_slot_id ?? null,
  };
}

function toApi(input: CreateListingInput): Record<string, unknown> {
  const images = input.images?.filter(Boolean) ?? [];
  return {
    title: input.title,
    item_name: input.itemName,
    price: input.price,
    description: input.description,
    brand: input.brand,
    series: input.series,
    condition: input.condition,
    trade_mode: input.tradeMode,
    shipping: input.shipping,
    shipping_methods: input.shippingMethods?.length
      ? input.shippingMethods
      : input.shipping
        ? [input.shipping]
        : [],
    allow_swap: input.allowSwap,
    allow_bargain: input.allowBargain,
    image: input.image,
    images,
    quantity: input.quantity,
  };
}

export async function getListings(): Promise<Listing[]> {
  const items = await apiFetch<ApiListing[]>('/api/listings');
  return items.map(toFrontend);
}

export async function getMyListings(): Promise<Listing[]> {
  const items = await apiFetch<ApiListing[]>('/api/listings/mine');
  return items.map(toFrontend);
}

export async function getListing(id: string): Promise<Listing> {
  const item = await apiFetch<ApiListing>(`/api/listings/${encodeURIComponent(id)}`);
  return toFrontend(item);
}

export async function createListing(input: CreateListingInput): Promise<Listing> {
  const item = await apiFetch<ApiListing>('/api/listings', {
    method: 'POST',
    body: JSON.stringify(toApi(input)),
  });
  return toFrontend(item);
}
