/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_SUPABASE_STORAGE_BUCKET?: string;
  readonly VITE_USE_MOCK_DATA?: string;
  readonly VITE_API_URL?: string;
  readonly VITE_DEV_USER_ID?: string;
  readonly VITE_DATA_SOURCE?: 'local' | 'supabase' | 'api';
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
