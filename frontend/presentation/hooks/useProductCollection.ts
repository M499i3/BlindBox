import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { CatalogProduct } from '@/frontend/domain/entities/catalog';
import type { Listing } from '@/frontend/domain/entities/listing';
import { useCatalogProducts } from '@/frontend/presentation/hooks/useCatalog';
import { useAppState } from '@/frontend/presentation/providers/AppStateProvider';
import { buildCatalogHierarchy } from '@/frontend/shared/utils/catalogHierarchy';
import {
  catalogProductFromListing,
  idsEqual,
  migrateCollectionIds,
  resolveProductIdFromListing,
  resolveProductIdFromTitle,
  resolveStorableWishProductId,
} from '@/frontend/shared/utils/productCollection';

type ListingLike = Pick<Listing, 'id' | 'title' | 'itemName'>;

export function useProductCollection() {
  const {
    ownedIds,
    wishIds,
    toggleOwned,
    toggleWish,
    isOwned,
    isWished,
    posts,
    replaceOwnedIds,
    replaceWishIds,
    openWantModal,
    addWishWithDefaultSettings,
  } = useAppState();
  const { products } = useCatalogProducts();
  const migratedRef = useRef(false);

  useEffect(() => {
    if (!products.length || migratedRef.current) return;
    const nextOwned = migrateCollectionIds(ownedIds, products, posts);
    const nextWish = migrateCollectionIds(wishIds, products, posts);
    migratedRef.current = true;
    if (!idsEqual(nextOwned, ownedIds)) replaceOwnedIds(nextOwned);
    if (!idsEqual(nextWish, wishIds)) replaceWishIds(nextWish);
  }, [products, posts, ownedIds, wishIds, replaceOwnedIds, replaceWishIds]);

  const resolveFromListing = useCallback(
    (listing: ListingLike) => resolveProductIdFromListing(listing, products),
    [products]
  );

  const resolveFromTitle = useCallback(
    (title: string) => resolveProductIdFromTitle(title, products),
    [products]
  );

  const addWishFromListing = useCallback(
    (listing: ListingLike & { image?: string }) => {
      const draft = catalogProductFromListing(listing, products);
      const pid = resolveStorableWishProductId(draft, products, listing);
      if (!pid) return;
      addWishWithDefaultSettings(pid, draft.title);
    },
    [products, addWishWithDefaultSettings]
  );

  const toggleWishFromListing = useCallback(
    (listing: ListingLike & { image?: string }) => {
      const pid = resolveProductIdFromListing(listing, products);
      if (pid && isWished(pid)) {
        toggleWish(pid);
        return;
      }
      addWishFromListing(listing);
    },
    [products, isWished, toggleWish, addWishFromListing]
  );

  const requestWishProduct = useCallback(
    (productId: string) => {
      if (isWished(productId)) {
        toggleWish(productId);
        return;
      }
      const product = products.find((p) => p.id === productId);
      if (product) addWishWithDefaultSettings(productId, product.title);
    },
    [isWished, toggleWish, addWishWithDefaultSettings, products]
  );

  const toggleOwnedFromListing = useCallback(
    (listing: ListingLike) => {
      const pid = resolveProductIdFromListing(listing, products);
      if (pid) toggleOwned(pid);
    },
    [products, toggleOwned]
  );

  const isListingWished = useCallback(
    (listing: ListingLike) => {
      const pid = resolveProductIdFromListing(listing, products);
      return pid ? isWished(pid) : false;
    },
    [products, isWished]
  );

  const isListingOwned = useCallback(
    (listing: ListingLike) => {
      const pid = resolveProductIdFromListing(listing, products);
      return pid ? isOwned(pid) : false;
    },
    [products, isOwned]
  );

  const wishedProducts = useMemo(
    () => products.filter((p) => wishIds.includes(p.id)),
    [products, wishIds]
  );

  const ownedProducts = useMemo(
    () => products.filter((p) => ownedIds.includes(p.id)),
    [products, ownedIds]
  );

  const collectionHierarchy = useMemo(
    () => buildCatalogHierarchy(products, ownedIds, { onlyCollected: true }),
    [products, ownedIds]
  );

  const toggleWishForProductIds = useCallback(
    (productIds: string[]) => {
      if (!productIds.length) return;
      const allOn = productIds.every((id) => isWished(id));
      for (const id of productIds) {
        if (allOn && isWished(id)) toggleWish(id);
        else if (!allOn && !isWished(id)) {
          const p = products.find((x) => x.id === id);
          if (p) addWishWithDefaultSettings(id, p.title);
        }
      }
    },
    [isWished, toggleWish, addWishWithDefaultSettings, products]
  );

  const toggleOwnedForProductIds = useCallback(
    (productIds: string[]) => {
      if (!productIds.length) return;
      const allOn = productIds.every((id) => isOwned(id));
      for (const id of productIds) {
        if (allOn && isOwned(id)) toggleOwned(id);
        else if (!allOn && !isOwned(id)) toggleOwned(id);
      }
    },
    [isOwned, toggleOwned]
  );

  const isAllWished = useCallback(
    (productIds: string[]) => productIds.length > 0 && productIds.every((id) => isWished(id)),
    [isWished]
  );

  const isAllOwned = useCallback(
    (productIds: string[]) => productIds.length > 0 && productIds.every((id) => isOwned(id)),
    [isOwned]
  );

  return {
    products,
    wishedProducts,
    ownedProducts,
    collectionHierarchy,
    wishCount: wishIds.length,
    ownedCount: ownedIds.length,
    resolveFromListing,
    resolveFromTitle,
    toggleWishFromListing,
    requestWishProduct,
    toggleOwnedFromListing,
    isListingWished,
    isListingOwned,
    toggleWish,
    toggleOwned,
    isWished,
    isOwned,
    toggleWishForProductIds,
    toggleOwnedForProductIds,
    isAllWished,
    isAllOwned,
    openWantModal,
  };
}

export type ProductCollectionApi = ReturnType<typeof useProductCollection>;
