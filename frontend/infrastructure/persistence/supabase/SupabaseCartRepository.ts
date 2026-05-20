import type { ICartRepository } from '@/frontend/domain/repositories/ICartRepository';
import { resolveDevUserId } from '@/frontend/infrastructure/persistence/supabase/devContext';
import { getSupabaseClient } from '@/frontend/infrastructure/persistence/supabase/supabaseClient';

/** Supabase 購物車（cart_items） */
export class SupabaseCartRepository implements ICartRepository {
  private listingIds: string[] = [];
  private ready = false;

  async initialize(): Promise<void> {
    if (this.ready) return;
    await this.reload();
    this.ready = true;
  }

  private async reload(): Promise<void> {
    const client = getSupabaseClient();
    const userId = await resolveDevUserId(client);

    const { data, error } = await client
      .from('cart_items')
      .select('listing_id')
      .eq('user_id', userId)
      .order('added_at', { ascending: true });

    if (error) {
      throw new Error(`讀取購物車失敗：${error.message}`);
    }

    this.listingIds = (data ?? []).map((r) => r.listing_id as string);
  }

  getListingIds(): string[] {
    return [...this.listingIds];
  }

  async setListingIds(ids: string[]): Promise<void> {
    await this.initialize();
    const client = getSupabaseClient();
    const userId = await resolveDevUserId(client);

    const unique = [...new Set(ids)];

    const { error: delErr } = await client
      .from('cart_items')
      .delete()
      .eq('user_id', userId);

    if (delErr) {
      throw new Error(`清空購物車失敗：${delErr.message}`);
    }

    if (unique.length === 0) {
      this.listingIds = [];
      return;
    }

    const rows = unique.map((listing_id) => ({
      user_id: userId,
      listing_id,
    }));

    const { error: insErr } = await client.from('cart_items').insert(rows);
    if (insErr) {
      throw new Error(`寫入購物車失敗：${insErr.message}`);
    }

    this.listingIds = unique;
  }
}
