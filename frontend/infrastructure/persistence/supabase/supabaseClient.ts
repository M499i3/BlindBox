import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '@/frontend/infrastructure/config/env';

let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (client) return client;
  const { url, anonKey } = getSupabaseConfig();
  if (!url || !anonKey) {
    throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env');
  }
  client = createClient(url, anonKey);
  return client;
}
