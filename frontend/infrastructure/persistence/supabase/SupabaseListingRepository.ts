import type { CreateListingInput, Listing } from '@/frontend/domain/entities/listing';
import type { IListingRepository } from '@/frontend/domain/repositories/IListingRepository';

/** Supabase 市集貼文實作（預留） */
export class SupabaseListingRepository implements IListingRepository {
  findUserListings(): Listing[] {
    throw new Error('SupabaseListingRepository 尚未實作');
  }

  findById(_id: string): Listing | undefined {
    throw new Error('SupabaseListingRepository 尚未實作');
  }

  saveUserListings(_listings: Listing[]): void {
    throw new Error('SupabaseListingRepository 尚未實作');
  }

  create(_input: CreateListingInput, _sellerName: string): Listing {
    throw new Error('SupabaseListingRepository 尚未實作');
  }
}
