import type { Listing } from '@/frontend/domain/entities/listing';

export function isOwnListing(
  listing: Pick<Listing, 'sellerId'>,
  userId: string
): boolean {
  return Boolean(userId && listing.sellerId && listing.sellerId === userId);
}
