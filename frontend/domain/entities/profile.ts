export type UserProfile = {
  id: string;
  displayName: string;
  avatarDataUrl: string | null;
  bio: string;
};

export const DEFAULT_USER_PROFILE: UserProfile = {
  id: '',
  displayName: 'Yu',
  avatarDataUrl: null,
  bio: '',
};
