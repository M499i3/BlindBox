import type { CreateListingInput, Listing } from '@/frontend/domain/entities/listing';
import type { IListingRepository } from '@/frontend/domain/repositories/IListingRepository';
import type { DbListing } from '@/frontend/infrastructure/persistence/supabase/dbTypes';
import { resolveDevUserId } from '@/frontend/infrastructure/persistence/supabase/devContext';
import {
  listingFromRow,
  listingToInsert,
  primaryListingImage,
} from '@/frontend/infrastructure/persistence/supabase/mappers';
import { getSupabaseClient } from '@/frontend/infrastructure/persistence/supabase/supabaseClient';

const LISTING_SELECT = `
  id,
  seller_id,
  catalog_product_id,
  brand_id,
  series_id,
  title,
  item_name,
  description,
  price_amount,
  price_currency,
  condition,
  trade_mode,
  shipping_method,
  allow_swap,
  allow_bargain,
  status,
  created_at,
  users ( display_name ),
  brands ( name ),
  series ( name ),
  listing_images ( id, listing_id, url, sort_order )
`;

/** Supabase 市集貼文 */
export class SupabaseListingRepository implements IListingRepository {
  private userListings: Listing[] = [];
  private activeListings: Listing[] = [];
  private sellerId: string | null = null;
  private ready = false;

  async initialize(): Promise<void> {
    if (this.ready) return;
    const client = getSupabaseClient();
    this.sellerId = await resolveDevUserId(client);
    await this.reload();
    this.ready = true;
  }

  private async reload(): Promise<void> {
    const client = getSupabaseClient();
    const sellerId = this.sellerId ?? (await resolveDevUserId(client));

    const { data: mine, error: mineErr } = await client
      .from('listings')
      .select(LISTING_SELECT)
      .eq('seller_id', sellerId)
      .is('deleted_at', null)
      .neq('status', 'removed')
      .order('created_at', { ascending: false });

    if (mineErr) {
      throw new Error(`讀取我的上架失敗：${mineErr.message}`);
    }

    const { data: active, error: activeErr } = await client
      .from('listings')
      .select(LISTING_SELECT)
      .eq('status', 'active')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(200);

    if (activeErr) {
      throw new Error(`讀取市集貼文失敗：${activeErr.message}`);
    }

    this.userListings = ((mine ?? []) as unknown as DbListing[]).map(
      listingFromRow
    );
    this.activeListings = ((active ?? []) as unknown as DbListing[]).map(
      listingFromRow
    );
  }

  findUserListings(): Listing[] {
    return [...this.userListings];
  }

  findActiveListings(): Listing[] {
    return [...this.activeListings];
  }

  findById(id: string): Listing | undefined {
    return (
      this.userListings.find((l) => l.id === id) ??
      this.activeListings.find((l) => l.id === id)
    );
  }

  async saveUserListings(_listings: Listing[]): Promise<void> {
    throw new Error('SupabaseListingRepository 不支援批次覆寫；請使用 create 或後台管理');
  }

  async create(input: CreateListingInput, sellerName: string): Promise<Listing> {
    await this.initialize();
    const client = getSupabaseClient();
    const sellerId = this.sellerId!;

    const { data: row, error } = await client
      .from('listings')
      .insert(listingToInsert(input, sellerId))
      .select(LISTING_SELECT)
      .single();

    if (error || !row) {
      throw new Error(`建立上架失敗：${error?.message ?? 'unknown'}`);
    }

    const imageUrl = primaryListingImage(input);
    if (imageUrl) {
      const { error: imgErr } = await client.from('listing_images').insert({
        listing_id: row.id,
        url: imageUrl,
        sort_order: 0,
      });
      if (imgErr) {
        console.warn('[SupabaseListingRepository] 主圖寫入失敗：', imgErr.message);
      }
    }

    await this.reload();

    const listing =
      this.findById(row.id) ??
      listingFromRow({
        ...(row as unknown as DbListing),
        users: { display_name: sellerName },
      });

    return listing;
  }
}
