import type { Listing } from '../../domain/entities/listing';
import { apiFetch } from './apiClient';

// Re-use the same snake→camel mapping as listingsApi by fetching through the same shapes
type ApiListing = {
  id: string; title: string; item_name: string; price: string;
  description: string; brand: string; series: string; condition: string;
  trade_mode: string; shipping: string; allow_swap: boolean;
  allow_bargain: boolean; image: string; created_at: string; seller_name: string;
};

function toFrontend(l: ApiListing): Listing {
  return {
    id: l.id, title: l.title, itemName: l.item_name, price: l.price,
    description: l.description, brand: l.brand, series: l.series,
    condition: l.condition, tradeMode: l.trade_mode, shipping: l.shipping,
    allowSwap: l.allow_swap, allowBargain: l.allow_bargain,
    image: l.image, createdAt: l.created_at, sellerName: l.seller_name,
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
