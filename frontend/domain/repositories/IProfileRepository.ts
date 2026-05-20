import type { UserProfile } from '@/frontend/domain/entities/profile';

export interface IProfileRepository {
  getProfile(): UserProfile;
  saveProfile(profile: UserProfile): void;
}
