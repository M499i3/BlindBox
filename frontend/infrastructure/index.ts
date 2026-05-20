/**
 * 資料層 — Repository 實作與組裝（全端三層架構）
 * @see docs/ARCHITECTURE.md
 */
export { createAppContainer } from '@/frontend/infrastructure/di/AppContainer';
export type { AppContainer } from '@/frontend/infrastructure/di/AppContainer';
export { getDataSourceMode, getSupabaseConfig } from '@/frontend/infrastructure/config/env';
export { getSupabaseClient } from '@/frontend/infrastructure/persistence/supabase/supabaseClient';
