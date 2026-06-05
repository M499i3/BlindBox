import type { MouseEvent } from 'react';
import type { NavigateFunction } from 'react-router-dom';
import type { Listing } from '@/frontend/domain/entities/listing';
import { isOwnListing } from '@/frontend/shared/utils/listingOwnership';
import { isSplitBoxListing } from '@/frontend/shared/utils/tradeMode';

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
    const canClaim = Boolean(item.splitBoxSlotId);
    return {
      showCart: false,
      actionLabel: canClaim ? '認領此款' : '無法認領',
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
