import {
  DEFAULT_USER_PROFILE,
  type UserProfile,
} from '@/frontend/domain/entities/profile';
import type { IProfileRepository } from '@/frontend/domain/repositories/IProfileRepository';

export class ProfileService {
  constructor(private readonly profileRepo: IProfileRepository) {}

  getProfile(): UserProfile {
    return this.profileRepo.getProfile();
  }

  async setAvatar(dataUrl: string | null): Promise<void> {
    const profile = this.getProfile();
    await this.profileRepo.saveProfile({ ...profile, avatarDataUrl: dataUrl });
  }

  async updateProfile(partial: Partial<UserProfile>): Promise<void> {
    const profile = this.getProfile();
    await this.profileRepo.saveProfile({
      ...DEFAULT_USER_PROFILE,
      ...profile,
      ...partial,
    });
  }
}
