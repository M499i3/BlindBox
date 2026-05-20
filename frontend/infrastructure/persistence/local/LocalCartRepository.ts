import type { ICartRepository } from '@/frontend/domain/repositories/ICartRepository';
import type { LocalStorageStore } from '@/frontend/infrastructure/persistence/local/LocalStorageStore';

export class LocalCartRepository implements ICartRepository {
  constructor(private readonly store: LocalStorageStore) {}

  getListingIds(): string[] {
    return this.store.load().cartIds;
  }

  setListingIds(ids: string[]): void {
    const snap = this.store.load();
    this.store.save({ ...snap, cartIds: ids });
  }
}
