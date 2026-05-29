export type UserProfile = {
  id: string;
  displayId: string;
  displayName: string;
  avatarDataUrl: string | null;
  bio: string;
  ratingAvg: number;
  ratingCount: number;
  transactionCount: number;
};

export const DEFAULT_USER_PROFILE: UserProfile = {
  id: '',
  displayId: '',
  displayName: 'Yu',
  avatarDataUrl: null,
  bio: '',
  ratingAvg: 0,
  ratingCount: 0,
  transactionCount: 0,
};
