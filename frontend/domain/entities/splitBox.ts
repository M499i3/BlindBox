export type SplitBoxSlotInput = {
  catalogProductId: string;
  productTitle?: string;
  productImage?: string;
  reservedByHost?: boolean;
  customPrice?: string;
};

export type CreateSplitBoxInput = {
  title: string;
  brand: string;
  ip?: string;
  series: string;
  description?: string;
  coverImage?: string;
  shipping?: string;
  shippingNote?: string;
  totalPrice: string;
  closesAt?: string;
  slots: SplitBoxSlotInput[];
};

export type SplitBoxSlot = {
  id: string;
  groupId: string;
  catalogProductId: string;
  productTitle: string;
  productImage: string;
  listingId: string | null;
  reservedByHost: boolean;
  claimedByUserId: string | null;
  claimedByName: string | null;
  claimedAt: string | null;
  price: string;
  status: 'reserved' | 'available' | 'claimed';
};

export type SplitBoxClaimedSlotBrief = {
  id: string;
  productTitle: string;
  productImage: string;
};

export type SplitBoxGroupSummary = {
  id: string;
  title: string;
  coverImage: string;
  brand: string;
  series: string;
  status: string;
  organizerId: string;
  organizerName: string;
  targetCount: number;
  reservedCount: number;
  claimedCount: number;
  availableCount: number;
  pricePerSlot: string;
  closesAt: string | null;
  createdAt: string;
  myClaimedSlots?: SplitBoxClaimedSlotBrief[];
};

export type SplitBoxGroupDetail = SplitBoxGroupSummary & {
  description: string;
  shipping: string;
  shippingNote: string;
  totalPrice: string;
  shippedAt: string | null;
  slots: SplitBoxSlot[];
  isOrganizer: boolean;
  myClaimedSlotIds: string[];
};

export const SPLIT_BOX_STATUS_LABEL: Record<string, string> = {
  open: '招募中',
  full: '已湊齊',
  shipping: '出貨中',
  completed: '已完成',
  cancelled: '已取消',
  expired: '已截止',
};
