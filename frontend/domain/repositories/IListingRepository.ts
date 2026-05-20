import type { CreateListingInput, Listing } from '@/frontend/domain/entities/listing';

export interface IListingRepository {
  findUserListings(): Listing[];
  findById(id: string): Listing | undefined;
  saveUserListings(listings: Listing[]): void;
  create(input: CreateListingInput, sellerName: string): Listing;
}
