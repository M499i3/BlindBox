import type { CreateListingInput, Listing } from '@/frontend/domain/entities/listing';
import type { IListingRepository } from '@/frontend/domain/repositories/IListingRepository';
import type { LocalStorageStore } from '@/frontend/infrastructure/persistence/local/LocalStorageStore';

export class LocalListingRepository implements IListingRepository {
  constructor(private readonly store: LocalStorageStore) {}

  findUserListings(): Listing[] {
    return this.store.load().listings;
  }

  findById(id: string): Listing | undefined {
    return this.findUserListings().find((l) => l.id === id);
  }

  saveUserListings(listings: Listing[]): void {
    const snap = this.store.load();
    this.store.save({ ...snap, listings });
  }

  create(input: CreateListingInput, sellerName: string): Listing {
    const listing: Listing = {
      ...input,
      id: `l_${Date.now()}`,
      createdAt: new Date().toISOString(),
      sellerName,
    };
    const listings = [listing, ...this.findUserListings()];
    this.saveUserListings(listings);
    return listing;
  }
}
