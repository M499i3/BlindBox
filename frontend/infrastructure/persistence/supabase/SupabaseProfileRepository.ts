import {
  DEFAULT_USER_PROFILE,
  type UserProfile,
} from '@/frontend/domain/entities/profile';
import type { IProfileRepository } from '@/frontend/domain/repositories/IProfileRepository';
import type { DbUser } from '@/frontend/infrastructure/persistence/supabase/dbTypes';
import { resolveDevUserId } from '@/frontend/infrastructure/persistence/supabase/devContext';
import { isHttpUrl, profileFromUser } from '@/frontend/infrastructure/persistence/supabase/mappers';
import { getSupabaseClient } from '@/frontend/infrastructure/persistence/supabase/supabaseClient';

const USER_SELECT = 'id, display_id, display_name, bio, avatar_url';

/** Supabase 個人資料（users 表） */
export class SupabaseProfileRepository implements IProfileRepository {
  private profile: UserProfile = { ...DEFAULT_USER_PROFILE };
  private ready = false;

  async initialize(): Promise<void> {
    if (this.ready) return;
    await this.reload();
    this.ready = true;
  }

  private async reload(): Promise<void> {
    const client = getSupabaseClient();
    const userId = await resolveDevUserId(client);

    const { data, error } = await client
      .from('users')
      .select(USER_SELECT)
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      throw new Error(`讀取個人資料失敗：${error.message}`);
    }

    if (data) {
      this.profile = profileFromUser(data as DbUser);
    } else {
      this.profile = { ...DEFAULT_USER_PROFILE };
    }
  }

  getProfile(): UserProfile {
    return { ...this.profile };
  }

  async saveProfile(profile: UserProfile): Promise<void> {
    await this.initialize();
    const client = getSupabaseClient();
    const userId = await resolveDevUserId(client);

    const avatar_url =
      profile.avatarDataUrl && isHttpUrl(profile.avatarDataUrl)
        ? profile.avatarDataUrl
        : null;

    const { error } = await client
      .from('users')
      .update({
        display_name: profile.displayName,
        bio: profile.bio,
        avatar_url,
      })
      .eq('id', userId);

    if (error) {
      throw new Error(`儲存個人資料失敗：${error.message}`);
    }

    this.profile = {
      ...profile,
      avatarDataUrl: avatar_url ?? profile.avatarDataUrl,
    };
  }
}
