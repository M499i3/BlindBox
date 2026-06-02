/**
 * 手機連 Vite Network 網址（如 http://192.168.x.x:3001）時，
 * 將仍指向 localhost 的 VITE_API_URL 改為同一 hostname 的後端 port。
 */
export function resolveApiUrl(): string {
  const configured = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

  if (typeof window === 'undefined') {
    return configured;
  }

  try {
    const api = new URL(configured);
    const apiIsLocal =
      api.hostname === 'localhost' || api.hostname === '127.0.0.1';
    const { hostname } = window.location;
    const frontendIsLan =
      hostname !== 'localhost' && hostname !== '127.0.0.1';

    if (apiIsLocal && frontendIsLan) {
      const port = api.port || '8000';
      return `${api.protocol}//${hostname}:${port}`;
    }
  } catch {
    // 使用原設定
  }

  return configured;
}
