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

  setAvatar(dataUrl: string | null): void {
    const profile = this.getProfile();
    this.profileRepo.saveProfile({ ...profile, avatarDataUrl: dataUrl });
  }

  updateProfile(partial: Partial<UserProfile>): void {
    const profile = this.getProfile();
    this.profileRepo.saveProfile({ ...DEFAULT_USER_PROFILE, ...profile, ...partial });
  }
}
