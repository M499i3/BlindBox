/** 資料來源模式：local = 瀏覽器／靜態檔；supabase | api = 預留 */
export type DataSourceMode = 'local' | 'supabase' | 'api';

export function getDataSourceMode(): DataSourceMode {
  const raw = import.meta.env.VITE_DATA_SOURCE as string | undefined;
  if (raw === 'supabase' || raw === 'api') return raw;
  return 'local';
}

export function getSupabaseConfig() {
  return {
    url: import.meta.env.VITE_SUPABASE_URL as string | undefined,
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined,
  };
}
