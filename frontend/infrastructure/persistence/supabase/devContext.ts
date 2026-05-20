import type { SupabaseClient } from '@supabase/supabase-js';
import { DEFAULT_USER_PROFILE } from '@/frontend/domain/entities/profile';

const DEV_DISPLAY_NAME = DEFAULT_USER_PROFILE.displayName;

let cachedUserId: string | null = null;

export function getDevUserIdFromEnv(): string | undefined {
  const raw = import.meta.env.VITE_DEV_USER_ID as string | undefined;
  return raw?.trim() || undefined;
}

/**
 * 開發用使用者 ID（尚未接 Auth 時）。
 * 優先 VITE_DEV_USER_ID；否則查／建立 display_name = Yu 的 users 列。
 */
export async function resolveDevUserId(client: SupabaseClient): Promise<string> {
  if (cachedUserId) return cachedUserId;

  const fromEnv = getDevUserIdFromEnv();
  if (fromEnv) {
    cachedUserId = fromEnv;
    return fromEnv;
  }

  const { data: existing, error: findErr } = await client
    .from('users')
    .select('id')
    .eq('display_name', DEV_DISPLAY_NAME)
    .is('deleted_at', null)
    .limit(1)
    .maybeSingle();

  if (findErr) {
    throw new Error(`無法查詢開發用使用者：${findErr.message}`);
  }
  if (existing?.id) {
    cachedUserId = existing.id;
    return existing.id;
  }

  const { data: created, error: insertErr } = await client
    .from('users')
    .insert({ display_name: DEV_DISPLAY_NAME })
    .select('id')
    .single();

  if (insertErr || !created?.id) {
    throw new Error(
      `無法建立開發用使用者。請在 .env 設定 VITE_DEV_USER_ID，或於 Supabase SQL Editor 執行 docs/supabase-dev-rls.sql。詳情：${insertErr?.message ?? 'unknown'}`
    );
  }

  cachedUserId = created.id;
  return created.id;
}

export function resetDevUserCache(): void {
  cachedUserId = null;
}
