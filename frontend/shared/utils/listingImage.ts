/** 貼文／商品卡片無圖時的預設圖 */
export const LISTING_PLACEHOLDER_IMAGE = '/blindy-icon.svg?v=1';

export function resolveListingImage(url?: string | null): string {
  const trimmed = url?.trim();
  return trimmed || LISTING_PLACEHOLDER_IMAGE;
}

export function hasListingImage(
  images?: string[] | null,
  fallbackImage?: string | null
): boolean {
  if (fallbackImage?.trim()) return true;
  return images?.some((url) => Boolean(url?.trim())) ?? false;
}

export function resolveListingImages(
  images?: string[] | null,
  fallbackImage?: string | null
): string[] {
  const merged = images?.map((url) => url.trim()).filter(Boolean) ?? [];
  if (merged.length > 0) return merged;

  const fallback = fallbackImage?.trim();
  if (fallback) return [fallback];

  return [LISTING_PLACEHOLDER_IMAGE];
}
