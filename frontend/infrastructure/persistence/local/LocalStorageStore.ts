import type { Listing } from '@/frontend/domain/entities/listing';
import type { UserProfile } from '@/frontend/domain/entities/profile';
import { DEFAULT_USER_PROFILE } from '@/frontend/domain/entities/profile';

const STORAGE_KEY = 'blindbox_app_state_v1';

export type LocalAppSnapshot = {
  avatarDataUrl: string | null;
  listings: Listing[];
  cartIds: string[];
  profile?: UserProfile;
};

const EMPTY: LocalAppSnapshot = {
  avatarDataUrl: null,
  listings: [],
  cartIds: [],
  profile: DEFAULT_USER_PROFILE,
};

export class LocalStorageStore {
  load(): LocalAppSnapshot {
    if (typeof localStorage === 'undefined') return { ...EMPTY };
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...EMPTY };
    try {
      const parsed = JSON.parse(raw) as Partial<LocalAppSnapshot>;
      return {
        avatarDataUrl: parsed.avatarDataUrl ?? null,
        listings: parsed.listings ?? [],
        cartIds: parsed.cartIds ?? [],
        profile: parsed.profile ?? {
          ...DEFAULT_USER_PROFILE,
          avatarDataUrl: parsed.avatarDataUrl ?? null,
        },
      };
    } catch {
      return { ...EMPTY };
    }
  }

  save(snapshot: LocalAppSnapshot): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  }
}
