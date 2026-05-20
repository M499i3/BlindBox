import {
  DEFAULT_USER_PROFILE,
  type UserProfile,
} from '@/frontend/domain/entities/profile';
import type { IProfileRepository } from '@/frontend/domain/repositories/IProfileRepository';
import type { LocalStorageStore } from '@/frontend/infrastructure/persistence/local/LocalStorageStore';

export class LocalProfileRepository implements IProfileRepository {
  constructor(private readonly store: LocalStorageStore) {}

  async initialize(): Promise<void> {
    /* localStorage 同步可用 */
  }

  getProfile(): UserProfile {
    const snap = this.store.load();
    return (
      snap.profile ?? {
        ...DEFAULT_USER_PROFILE,
        avatarDataUrl: snap.avatarDataUrl,
      }
    );
  }

  async saveProfile(profile: UserProfile): Promise<void> {
    const snap = this.store.load();
    this.store.save({
      ...snap,
      profile,
      avatarDataUrl: profile.avatarDataUrl,
    });
  }
}
