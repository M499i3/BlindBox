import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Listing } from '@/frontend/domain/entities/listing';
import { useAppState } from '@/frontend/presentation/providers/AppStateProvider';
import { buildListingCardActionProps } from '@/frontend/shared/utils/listingCardActions';

export function useListingCardActions() {
  const navigate = useNavigate();
  const { isInCart, addToCart, userId } = useAppState();

  const getActionProps = useCallback(
    (item: Listing) =>
      buildListingCardActionProps(item, { userId, isInCart, addToCart, navigate }),
    [userId, isInCart, addToCart, navigate]
  );

  return { getActionProps };
}
