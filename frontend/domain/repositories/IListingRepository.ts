import type { CreateListingInput, Listing } from '@/frontend/domain/entities/listing';

export interface IListingRepository {
  initialize(): Promise<void>;
  findUserListings(): Listing[];
  /** 市集上所有 active 貼文（含其他賣家） */
  findActiveListings(): Listing[];
  findById(id: string): Listing | undefined;
  saveUserListings(listings: Listing[]): Promise<void>;
  create(input: CreateListingInput, sellerName: string): Promise<Listing>;
}
