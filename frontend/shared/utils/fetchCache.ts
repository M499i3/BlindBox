import { useEffect, useRef, useState, type DependencyList } from 'react';

const DEFAULT_STALE_MS = 10 * 60 * 1000;

type CacheEntry<T> = { data: T; at: number };

export type FetchCacheOptions = { staleMs?: number; force?: boolean };

const store = new Map<string, CacheEntry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

type InvalidateListener = (prefix?: string) => void;
const listeners = new Set<InvalidateListener>();

function normalizeOptions(third?: number | FetchCacheOptions): FetchCacheOptions {
  if (typeof third === 'number') return { staleMs: third };
  return third ?? {};
}

export function subscribeCacheInvalidate(listener: InvalidateListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function peekCache<T>(key: string): T | undefined {
  const entry = store.get(key);
  return entry ? (entry.data as T) : undefined;
}

export function setCache<T>(key: string, data: T): void {
  store.set(key, { data, at: Date.now() });
}

function clearInflight(prefix?: string): void {
  for (const key of inflight.keys()) {
    if (!prefix || key.startsWith(prefix)) inflight.delete(key);
  }
}

export function invalidateCache(prefix?: string): void {
  if (!prefix) {
    store.clear();
    clearInflight();
  } else {
    for (const key of store.keys()) {
      if (key.startsWith(prefix)) store.delete(key);
    }
    clearInflight(prefix);
  }
  listeners.forEach((listener) => listener(prefix));
}

export async function fetchCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: number | FetchCacheOptions
): Promise<T> {
  const { staleMs = DEFAULT_STALE_MS, force = false } = normalizeOptions(options);
  const entry = store.get(key);
  const now = Date.now();

  if (!force && entry && now - entry.at < staleMs) {
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

/** 刪除快取並強制重新請求 */
export async function refetchCached<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  store.delete(key);
  inflight.delete(key);
  return fetchCached(key, fetcher, { force: true, staleMs: 0 });
}

/** 快取失效時遞增，供非 useCachedFetch 的元件觸發重抓 */
export function useCacheGeneration(): number {
  const [generation, setGeneration] = useState(0);
  useEffect(() => subscribeCacheInvalidate(() => setGeneration((g) => g + 1)), []);
  return generation;
}

export function useOnCacheInvalidate(callback: () => void, prefix?: string): void {
  useEffect(() => {
    return subscribeCacheInvalidate((invalidatedPrefix) => {
      if (!prefix) {
        callback();
        return;
      }
      if (!invalidatedPrefix || invalidatedPrefix.startsWith(prefix)) {
        callback();
      }
    });
  }, [callback, prefix]);
}

export function useCachedFetch<T>(
  key: string | null,
  fetcher: () => Promise<T>,
  deps: DependencyList,
  opts?: { staleMs?: number; enabled?: boolean; initial?: T }
): { data: T | undefined; loading: boolean; refreshing: boolean } {
  const enabled = opts?.enabled !== false && key != null;
  const cacheGeneration = useCacheGeneration();
  const prevGenerationRef = useRef(cacheGeneration);

  const [data, setData] = useState<T | undefined>(() => {
    if (!enabled || !key) return opts?.initial;
    return peekCache<T>(key) ?? opts?.initial;
  });

  const [loading, setLoading] = useState(() => {
    if (!enabled || !key) return false;
    return peekCache<T>(key) === undefined;
  });

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!enabled || !key) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    let cancelled = false;
    const forcedRefresh = cacheGeneration !== prevGenerationRef.current;
    prevGenerationRef.current = cacheGeneration;

    const hit = peekCache<T>(key);
    if (hit !== undefined && !forcedRefresh) {
      setData(hit);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (hit !== undefined) {
      setData(hit);
      setLoading(false);
      setRefreshing(true);
    } else {
      setLoading(true);
      setRefreshing(false);
    }

    fetchCached(key, fetcher, hit !== undefined ? { force: true, staleMs: 0 } : undefined)
      .then((value) => {
        if (!cancelled) setData(value);
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled, opts?.staleMs, cacheGeneration, ...deps]);

  return { data, loading, refreshing };
}
