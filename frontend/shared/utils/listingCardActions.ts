import type { MouseEvent } from 'react';
import type { NavigateFunction } from 'react-router-dom';
import type { Listing } from '@/frontend/domain/entities/listing';
import { isOwnListing } from '@/frontend/shared/utils/listingOwnership';

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
};

export function buildListingCardActionProps(
  item: Listing,
  ctx: ListingCardActionContext
): ListingCardActionProps {
  if (isOwnListing(item, ctx.userId)) {
    return { showCart: false };
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
