import { apiFetch } from './apiClient';
import { clearAuth, setAuth, type StoredAuthUser } from '../auth/authStorage';

type ApiAuthUser = {
  id: string;
  email: string;
  display_name: string;
};

type ApiLoginResponse = {
  access_token: string;
  token_type: string;
  user: ApiAuthUser;
};

function toStoredUser(u: ApiAuthUser): StoredAuthUser {
  return {
    id: u.id,
    email: u.email,
    displayName: u.display_name,
  };
}

export async function login(email: string, password: string): Promise<StoredAuthUser> {
  const res = await apiFetch<ApiLoginResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
    skipAuth: true,
  });
  const user = toStoredUser(res.user);
  setAuth(res.access_token, user);
  return user;
}

export async function fetchMe(): Promise<StoredAuthUser> {
  const u = await apiFetch<ApiAuthUser>('/api/auth/me');
  const user = toStoredUser(u);
  const token = localStorage.getItem('blindbox_access_token');
  if (token) {
    setAuth(token, user);
  }
  return user;
}

export function logout(): void {
  clearAuth();
}
