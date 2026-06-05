import type { Listing } from '../../domain/entities/listing';
import { apiFetch } from './apiClient';

type ApiListing = {
  id: string;
  title: string;
  item_name: string;
  price: string;
  description: string;
  brand: string;
  ip?: string;
  series: string;
  catalog_product_id?: string | null;
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
  split_box_slot_status?: string | null;
  split_box_group_status?: string | null;
  quantity?: number;
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
    ip: l.ip ?? '',
    series: l.series,
    catalogProductId: l.catalog_product_id ?? undefined,
    condition: l.condition,
    tradeMode: l.trade_mode,
    shipping: l.shipping,
    allowSwap: l.allow_swap,
    allowBargain: l.allow_bargain,
    image: l.image || images[0] || '',
    images,
    createdAt: l.created_at,
    sellerName: l.seller_name,
    sellerId: l.seller_id,
    quantity: l.quantity ?? 1,
    splitBoxGroupId: l.split_box_group_id ?? null,
    splitBoxSlotId: l.split_box_slot_id ?? null,
    splitBoxSlotStatus: l.split_box_slot_status ?? null,
    splitBoxGroupStatus: l.split_box_group_status ?? null,
  };
}

export async function getCart(): Promise<Listing[]> {
  const items = await apiFetch<ApiListing[]>('/api/cart');
  return items.map(toFrontend);
}

export async function addToCart(listingId: string): Promise<void> {
  await apiFetch<unknown>(`/api/cart/items/${encodeURIComponent(listingId)}`, { method: 'POST' });
}

export async function removeFromCart(listingId: string): Promise<void> {
  await apiFetch<unknown>(`/api/cart/items/${encodeURIComponent(listingId)}`, { method: 'DELETE' });
}
