import type { CreateListingInput, Listing } from '@/frontend/domain/entities/listing';
import type { IListingRepository } from '@/frontend/domain/repositories/IListingRepository';
import type { LocalStorageStore } from '@/frontend/infrastructure/persistence/local/LocalStorageStore';

export class LocalListingRepository implements IListingRepository {
  constructor(private readonly store: LocalStorageStore) {}

  async initialize(): Promise<void> {
    /* localStorage 同步可用 */
  }

  findUserListings(): Listing[] {
    return this.store.load().listings;
  }

  findActiveListings(): Listing[] {
    return [];
  }

  findById(id: string): Listing | undefined {
    return this.findUserListings().find((l) => l.id === id);
  }

  async saveUserListings(listings: Listing[]): Promise<void> {
    const snap = this.store.load();
    this.store.save({ ...snap, listings });
  }

  async create(input: CreateListingInput, sellerName: string): Promise<Listing> {
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
