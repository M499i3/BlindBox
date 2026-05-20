import type { UserProfile } from '@/frontend/domain/entities/profile';

export interface IProfileRepository {
  initialize(): Promise<void>;
  getProfile(): UserProfile;
  saveProfile(profile: UserProfile): Promise<void>;
}
