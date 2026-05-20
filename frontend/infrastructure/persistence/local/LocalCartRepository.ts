import type { ICartRepository } from '@/frontend/domain/repositories/ICartRepository';
import type { LocalStorageStore } from '@/frontend/infrastructure/persistence/local/LocalStorageStore';

export class LocalCartRepository implements ICartRepository {
  constructor(private readonly store: LocalStorageStore) {}

  async initialize(): Promise<void> {
    /* localStorage 同步可用 */
  }

  getListingIds(): string[] {
    return this.store.load().cartIds;
  }

  async setListingIds(ids: string[]): Promise<void> {
    const snap = this.store.load();
    this.store.save({ ...snap, cartIds: ids });
  }
}
