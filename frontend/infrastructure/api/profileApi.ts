import type { UserProfile } from '../../domain/entities/profile';
import { apiFetch } from './apiClient';

/** API 回傳的欄位命名（snake_case） */
type ApiProfile = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  bio: string;
};

function toFrontend(p: ApiProfile): UserProfile {
  return {
    id: p.id,
    displayName: p.display_name,
    avatarDataUrl: p.avatar_url ?? null,
    bio: p.bio ?? '',
  };
}

export async function getProfile(): Promise<UserProfile> {
  const p = await apiFetch<ApiProfile>('/api/profile/me');
  return toFrontend(p);
}

export async function updateProfile(data: Partial<UserProfile>): Promise<UserProfile> {
  const body: Record<string, string | null> = {};
  if (data.displayName !== undefined) body['display_name'] = data.displayName;
  if (data.bio !== undefined) body['bio'] = data.bio;
  if (data.avatarDataUrl !== undefined) body['avatar_url'] = data.avatarDataUrl;
  const p = await apiFetch<ApiProfile>('/api/profile/me', {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  return toFrontend(p);
}
