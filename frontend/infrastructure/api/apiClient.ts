import { clearAuth, getAccessToken } from '../auth/authStorage';
import { resolveApiUrl } from './resolveApiUrl';

export type ApiFetchOptions = RequestInit & {
  /** 登入請求不帶 Bearer */
  skipAuth?: boolean;
};

export async function apiFetch<T>(path: string, init?: ApiFetchOptions): Promise<T> {
  const { skipAuth, ...rest } = init ?? {};
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(rest.headers as Record<string, string> | undefined),
  };
  if (!skipAuth) {
    const token = getAccessToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  const res = await fetch(`${resolveApiUrl()}${path}`, {
    ...rest,
    headers,
  });

  if (res.status === 401 && !skipAuth) {
    clearAuth();
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
      window.location.assign('/login');
    }
  }

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`API ${path} → ${res.status}: ${text}`);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  const text = await res.text();
  if (!text) {
    return undefined as T;
  }
  return JSON.parse(text) as T;
}
