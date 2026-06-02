import type {
  CreateSplitBoxInput,
  SplitBoxGroupDetail,
  SplitBoxGroupSummary,
  SplitBoxSlot,
} from '@/frontend/domain/entities/splitBox';
import { apiFetch } from './apiClient';

type ApiSlot = {
  id: string;
  group_id: string;
  catalog_product_id: string;
  product_title: string;
  product_image: string;
  listing_id: string | null;
  reserved_by_host: boolean;
  claimed_by_user_id: string | null;
  claimed_by_name: string | null;
  claimed_at: string | null;
  price: string;
  status: string;
};

type ApiSummary = {
  id: string;
  title: string;
  cover_image: string;
  brand: string;
  series: string;
  status: string;
  organizer_id: string;
  organizer_name: string;
  target_count: number;
  reserved_count: number;
  claimed_count: number;
  available_count: number;
  price_per_slot: string;
  closes_at: string | null;
  created_at: string;
};

type ApiDetail = ApiSummary & {
  description: string;
  shipping: string;
  shipping_note: string;
  total_price: string;
  shipped_at: string | null;
  slots: ApiSlot[];
  is_organizer: boolean;
  my_claimed_slot_ids: string[];
};

function slotToFrontend(s: ApiSlot): SplitBoxSlot {
  return {
    id: s.id,
    groupId: s.group_id,
    catalogProductId: s.catalog_product_id,
    productTitle: s.product_title,
    productImage: s.product_image,
    listingId: s.listing_id,
    reservedByHost: s.reserved_by_host,
    claimedByUserId: s.claimed_by_user_id,
    claimedByName: s.claimed_by_name,
    claimedAt: s.claimed_at,
    price: s.price,
    status: s.status as SplitBoxSlot['status'],
  };
}

function summaryToFrontend(g: ApiSummary): SplitBoxGroupSummary {
  return {
    id: g.id,
    title: g.title,
    coverImage: g.cover_image,
    brand: g.brand,
    series: g.series,
    status: g.status,
    organizerId: g.organizer_id,
    organizerName: g.organizer_name,
    targetCount: g.target_count,
    reservedCount: g.reserved_count,
    claimedCount: g.claimed_count,
    availableCount: g.available_count,
    pricePerSlot: g.price_per_slot,
    closesAt: g.closes_at,
    createdAt: g.created_at,
  };
}

function detailToFrontend(g: ApiDetail): SplitBoxGroupDetail {
  return {
    ...summaryToFrontend(g),
    description: g.description,
    shipping: g.shipping,
    shippingNote: g.shipping_note,
    totalPrice: g.total_price,
    shippedAt: g.shipped_at,
    slots: g.slots.map(slotToFrontend),
    isOrganizer: g.is_organizer,
    myClaimedSlotIds: g.my_claimed_slot_ids,
  };
}

function createPayload(input: CreateSplitBoxInput) {
  return {
    title: input.title,
    brand: input.brand,
    series: input.series,
    description: input.description,
    cover_image: input.coverImage,
    shipping: input.shipping ?? '7-11 店到店',
    shipping_note: input.shippingNote,
    total_price: input.totalPrice,
    closes_at: input.closesAt,
    slots: input.slots.map((s) => ({
      catalog_product_id: s.catalogProductId,
      product_title: s.productTitle,
      product_image: s.productImage,
      reserved_by_host: s.reservedByHost ?? false,
      custom_price: s.customPrice,
    })),
  };
}

export async function createSplitBox(input: CreateSplitBoxInput): Promise<SplitBoxGroupDetail> {
  const data = await apiFetch<ApiDetail>('/api/split-boxes', {
    method: 'POST',
    body: JSON.stringify(createPayload(input)),
  });
  return detailToFrontend(data);
}

export async function listSplitBoxes(): Promise<SplitBoxGroupSummary[]> {
  const rows = await apiFetch<ApiSummary[]>('/api/split-boxes');
  return rows.map(summaryToFrontend);
}

export async function listMyOrganizedSplitBoxes(): Promise<SplitBoxGroupSummary[]> {
  const rows = await apiFetch<ApiSummary[]>('/api/split-boxes/mine/organized');
  return rows.map(summaryToFrontend);
}

export async function listMyJoinedSplitBoxes(): Promise<SplitBoxGroupSummary[]> {
  const rows = await apiFetch<ApiSummary[]>('/api/split-boxes/mine/joined');
  return rows.map(summaryToFrontend);
}

export async function getSplitBox(id: string): Promise<SplitBoxGroupDetail> {
  const data = await apiFetch<ApiDetail>(`/api/split-boxes/${id}`);
  return detailToFrontend(data);
}

export async function claimSplitBoxSlot(groupId: string, slotId: string): Promise<SplitBoxGroupDetail> {
  const data = await apiFetch<ApiDetail>(`/api/split-boxes/${groupId}/claim`, {
    method: 'POST',
    body: JSON.stringify({ slot_id: slotId }),
  });
  return detailToFrontend(data);
}

export async function shipSplitBox(groupId: string, shippingNote?: string): Promise<SplitBoxGroupDetail> {
  const data = await apiFetch<ApiDetail>(`/api/split-boxes/${groupId}/ship`, {
    method: 'POST',
    body: JSON.stringify({ shipping_note: shippingNote }),
  });
  return detailToFrontend(data);
}

export async function completeSplitBox(groupId: string): Promise<SplitBoxGroupDetail> {
  const data = await apiFetch<ApiDetail>(`/api/split-boxes/${groupId}/complete`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
  return detailToFrontend(data);
}
