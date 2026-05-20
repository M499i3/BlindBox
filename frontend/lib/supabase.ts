/**
 * @deprecated 請改用 getSupabaseClient() from infrastructure
 */
import { getSupabaseClient } from '@/frontend/infrastructure/persistence/supabase/supabaseClient';

export const supabase = getSupabaseClient();
export { getSupabaseClient };
