import type { Listing } from '@/frontend/domain/entities/listing';

/** DB enum → UI label (matches backend _SHIPPING_UI) */
const SHIPPING_DB_TO_UI: Record<string, string> = {
  '711_store': '7-11 店到店',
  family_store: '全家 店到店',
  in_person: '面交 (特定區域)',
  post_office: '郵局包裹',
};

export function normalizeShippingLabel(value: string): string {
  const trimmed = value.trim();
  const bare = trimmed.replace(/^\{|\}$/g, '');
  return SHIPPING_DB_TO_UI[trimmed] ?? SHIPPING_DB_TO_UI[bare] ?? trimmed;
}

/** Coerce API/DB shapes into a deduped list of UI labels */
export function coerceShippingMethods(methods: unknown): string[] {
  if (methods == null) return [];

  if (Array.isArray(methods)) {
    return [...new Set(methods.filter((m): m is string => typeof m === 'string').map(normalizeShippingLabel))];
  }

  if (typeof methods === 'string') {
    const trimmed = methods.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      const inner = trimmed.slice(1, -1).trim();
      if (!inner) return [];
      return [...new Set(inner.split(',').map((part) => normalizeShippingLabel(part.trim())))]
    }
    return [normalizeShippingLabel(trimmed)];
  }

  return [];
}

export function listingShippingOptions(
  listing: Pick<Listing, 'shipping' | 'shippingMethods'>
): string[] {
  const fromMethods = coerceShippingMethods(listing.shippingMethods);
  if (fromMethods.length) return fromMethods;
  if (listing.shipping) return [normalizeShippingLabel(listing.shipping)];
  return ['7-11 店到店'];
}
