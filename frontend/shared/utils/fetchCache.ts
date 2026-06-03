import { useEffect, useState } from 'react';

const DEFAULT_STALE_MS = 10 * 60 * 1000;

type CacheEntry<T> = { data: T; at: number };

const store = new Map<string, CacheEntry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

export function peekCache<T>(key: string): T | undefined {
  const entry = store.get(key);
  return entry ? (entry.data as T) : undefined;
}

export function setCache<T>(key: string, data: T): void {
  store.set(key, { data, at: Date.now() });
}

export function invalidateCache(prefix?: string): void {
  if (!prefix) {
    store.clear();
    return;
  }
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}

export async function fetchCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  staleMs = DEFAULT_STALE_MS
): Promise<T> {
  const entry = store.get(key);
  const now = Date.now();
  if (entry && now - entry.at < staleMs) {
    return entry.data as T;
  }

  const pending = inflight.get(key);
  if (pending) return pending as Promise<T>;

  const promise = fetcher()
    .then((data) => {
      store.set(key, { data, at: Date.now() });
      return data;
    })
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, promise);
  return promise;
}

export function useCachedFetch<T>(
  key: string | null,
  fetcher: () => Promise<T>,
  deps: React.DependencyList,
  opts?: { staleMs?: number; enabled?: boolean; initial?: T }
): { data: T | undefined; loading: boolean } {
  const enabled = opts?.enabled !== false && key != null;

  const [data, setData] = useState<T | undefined>(() => {
    if (!enabled || !key) return opts?.initial;
    return peekCache<T>(key) ?? opts?.initial;
  });

  const [loading, setLoading] = useState(() => {
    if (!enabled || !key) return false;
    return peekCache<T>(key) === undefined;
  });

  useEffect(() => {
    if (!enabled || !key) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const hit = peekCache<T>(key);
    if (hit !== undefined) {
      setData(hit);
      setLoading(false);
    } else {
      setLoading(true);
    }

    fetchCached(key, fetcher, opts?.staleMs)
      .then((value) => {
        if (!cancelled) setData(value);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled, opts?.staleMs, ...deps]);

  return { data, loading };
}
