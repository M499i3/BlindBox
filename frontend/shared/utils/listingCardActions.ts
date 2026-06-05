import type { MouseEvent } from 'react';
import type { NavigateFunction } from 'react-router-dom';
import type { Listing } from '@/frontend/domain/entities/listing';
import { isOwnListing } from '@/frontend/shared/utils/listingOwnership';
import { isClaimableSplitBoxListing, isSplitBoxListing } from '@/frontend/shared/utils/tradeMode';

export type ListingCardActionContext = {
  userId: string | null | undefined;
  isInCart: (listingId: string) => boolean;
  addToCart: (listingId: string) => void;
  navigate: NavigateFunction;
};

export type ListingCardActionProps = {
  showCart?: boolean;
  isInCart?: boolean;
  cartDisabled?: boolean;
  onAddToCart?: (e: MouseEvent) => void;
  actionLabel?: string;
  actionDisabled?: boolean;
  onAction?: (e: MouseEvent) => void;
};

export function buildListingCardActionProps(
  item: Listing,
  ctx: ListingCardActionContext
): ListingCardActionProps {
  if (isOwnListing(item, ctx.userId)) {
    return { showCart: false };
  }

  if (isSplitBoxListing(item) && item.splitBoxGroupId) {
    const canClaim = isClaimableSplitBoxListing(item);
    const alreadyInCart = ctx.isInCart(item.id);
    const actionLabel = canClaim
      ? '認領此款'
      : item.splitBoxSlotStatus === 'claimed'
        ? '已認領'
        : '無法認領';
    return {
      // 拆盒款式的「購物車」＝考慮清單：仍可認領時才允許加入
      showCart: canClaim,
      isInCart: alreadyInCart,
      cartDisabled: alreadyInCart,
      onAddToCart: (e) => {
        e.stopPropagation();
        if (!canClaim || alreadyInCart) return;
        ctx.addToCart(item.id);
      },
      actionLabel,
      actionDisabled: !canClaim,
      onAction: (e) => {
        e.stopPropagation();
        if (!canClaim) return;
        const params = new URLSearchParams({ listingId: item.id });
        if (item.splitBoxSlotId) params.set('slotId', item.splitBoxSlotId);
        ctx.navigate(`/split-box/${item.splitBoxGroupId}/apply?${params}`);
      },
    };
  }

  return {
    showCart: true,
    isInCart: ctx.isInCart(item.id),
    cartDisabled: ctx.isInCart(item.id),
    onAddToCart: (e) => {
      e.stopPropagation();
      if (ctx.isInCart(item.id)) return;
      ctx.addToCart(item.id);
    },
  };
}
