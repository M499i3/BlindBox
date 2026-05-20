export type UserProfile = {
  displayName: string;
  avatarDataUrl: string | null;
  bio: string;
};

export const DEFAULT_USER_PROFILE: UserProfile = {
  displayName: 'Yu',
  avatarDataUrl: null,
  bio: '',
};
