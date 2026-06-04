import type {
  CreateSwapProposalInput,
  SwapProposal,
} from '@/frontend/domain/entities/swapProposal';
import type { CreateListingInput } from '@/frontend/domain/entities/listing';
import { apiFetch } from './apiClient';

type ApiSwapListingSummary = {
  id: string;
  title: string;
  item_name: string;
  image: string;
  condition: string;
  brand: string;
  series: string;
};

type ApiSwapProposal = {
  id: string;
  chat_id: string | null;
  proposer_id: string;
  proposer_name: string;
  receiver_id: string;
  receiver_name: string;
  wanted_listing_id: string;
  offered_listing_id: string;
  wanted_listing: ApiSwapListingSummary;
  offered_listing: ApiSwapListingSummary;
  additional_amount: number;
  message: string;
  status: string;
  created_at: string;
};

function summaryToFrontend(s: ApiSwapListingSummary) {
  return {
    id: s.id,
    title: s.title,
    itemName: s.item_name,
    image: s.image,
    condition: s.condition,
    brand: s.brand,
    series: s.series,
  };
}

function toFrontend(p: ApiSwapProposal): SwapProposal {
  return {
    id: p.id,
    chatId: p.chat_id,
    proposerId: p.proposer_id,
    proposerName: p.proposer_name,
    receiverId: p.receiver_id,
    receiverName: p.receiver_name,
    wantedListingId: p.wanted_listing_id,
    offeredListingId: p.offered_listing_id,
    wantedListing: summaryToFrontend(p.wanted_listing),
    offeredListing: summaryToFrontend(p.offered_listing),
    additionalAmount: p.additional_amount,
    message: p.message,
    status: p.status as SwapProposal['status'],
    createdAt: p.created_at,
  };
}

function offerToApi(offer: CreateListingInput) {
  return {
    title: offer.title,
    item_name: offer.itemName,
    price: offer.price,
    description: offer.description,
    brand: offer.brand,
    ip: offer.ip ?? '',
    series: offer.series,
    condition: offer.condition,
    trade_mode: offer.tradeMode,
    shipping: offer.shipping,
    allow_swap: offer.allowSwap,
    allow_bargain: offer.allowBargain,
    quantity: offer.quantity,
    image: offer.image,
    images: offer.images,
    catalog_product_id: offer.catalogProductId?.trim() || null,
  };
}

function createInputToApi(input: CreateSwapProposalInput) {
  const body: Record<string, unknown> = {
    wanted_listing_id: input.wantedListingId,
    message: input.message,
    additional_amount: input.additionalAmount ?? 0,
  };
  if (input.offeredListingId) body.offered_listing_id = input.offeredListingId;
  if (input.offer) body.offer = offerToApi(input.offer);
  return body;
}

export async function createSwapProposal(input: CreateSwapProposalInput): Promise<SwapProposal> {
  const item = await apiFetch<ApiSwapProposal>('/api/swap-proposals', {
    method: 'POST',
    body: JSON.stringify(createInputToApi(input)),
  });
  return toFrontend(item);
}

export async function getMySwapProposalForListing(listingId: string): Promise<SwapProposal | null> {
  const item = await apiFetch<ApiSwapProposal | null>(
    `/api/swap-proposals/for-listing/${encodeURIComponent(listingId)}/mine`
  );
  return item ? toFrontend(item) : null;
}

export async function getSwapProposalsForListing(listingId: string): Promise<SwapProposal[]> {
  const items = await apiFetch<ApiSwapProposal[]>(
    `/api/swap-proposals/by-listing/${encodeURIComponent(listingId)}`
  );
  return items.map(toFrontend);
}

export async function acceptSwapProposal(proposalId: string): Promise<SwapProposal> {
  const item = await apiFetch<ApiSwapProposal>(
    `/api/swap-proposals/${encodeURIComponent(proposalId)}/accept`,
    { method: 'POST' }
  );
  return toFrontend(item);
}

export async function rejectSwapProposal(proposalId: string): Promise<SwapProposal> {
  const item = await apiFetch<ApiSwapProposal>(
    `/api/swap-proposals/${encodeURIComponent(proposalId)}/reject`,
    { method: 'POST' }
  );
  return toFrontend(item);
}

export async function cancelSwapProposal(proposalId: string): Promise<SwapProposal> {
  const item = await apiFetch<ApiSwapProposal>(
    `/api/swap-proposals/${encodeURIComponent(proposalId)}/cancel`,
    { method: 'POST' }
  );
  return toFrontend(item);
}
