import type { CreateListingInput } from '@/frontend/domain/entities/listing';

export type SwapProposalStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'completed';

export type SwapProposalListingSummary = {
  id: string;
  title: string;
  itemName: string;
  image: string;
  condition: string;
  brand: string;
  series: string;
};

export type SwapProposal = {
  id: string;
  chatId?: string | null;
  proposerId: string;
  proposerName: string;
  receiverId: string;
  receiverName: string;
  wantedListingId: string;
  offeredListingId: string;
  wantedListing: SwapProposalListingSummary;
  offeredListing: SwapProposalListingSummary;
  additionalAmount: number;
  message: string;
  status: SwapProposalStatus;
  createdAt: string;
};

export type CreateSwapProposalInput = {
  wantedListingId: string;
  offeredListingId?: string;
  offer?: CreateListingInput;
  message?: string;
  additionalAmount?: number;
};

export type SwapOfferFormValue = {
  source: 'form' | 'existing';
  offeredListingId: string;
  images: string[];
  localImageFiles: (File | null)[];
  title: string;
  itemName: string;
  brand: string;
  series: string;
  condition: string;
  description: string;
  shipping: string;
  message: string;
  additionalAmount: string;
};

export const DEFAULT_SWAP_OFFER_FORM: SwapOfferFormValue = {
  source: 'form',
  offeredListingId: '',
  images: [],
  localImageFiles: [],
  title: '',
  itemName: '',
  brand: '',
  series: '',
  condition: '全新未拆',
  description: '',
  shipping: '7-11 店到店',
  message: '',
  additionalAmount: '',
};
