import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { CatalogProduct } from '@/frontend/domain/entities/catalog';
import type { Listing } from '@/frontend/domain/entities/listing';
import { useCatalogProducts } from '@/frontend/presentation/hooks/useCatalog';
import { useAppState } from '@/frontend/presentation/providers/AppStateProvider';
import { buildCatalogHierarchy } from '@/frontend/shared/utils/catalogHierarchy';
import {
  canonicalProductId,
  idsEqual,
  isProductInCollection,
  migrateCollectionIds,
  resolveCollectionId,
  resolveProductIdFromListing,
  resolveProductIdFromTitle,
} from '@/frontend/shared/utils/productCollection';

type ListingLike = Pick<Listing, 'id' | 'title' | 'itemName'>;

export function useProductCollection() {
  const {
    ownedIds,
    wishIds,
    toggleOwned,
    toggleWish,
    isOwned: isOwnedRaw,
    isWished: isWishedRaw,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 僅在圖鑑載入後遷移一次
  }, [products, posts, replaceOwnedIds, replaceWishIds]);

  const toCanonical = useCallback(
    (productId: string) => canonicalProductId(productId, products),
    [products]
  );

  const resolveStoredId = useCallback(
    (productId: string, storedIds: string[]) => {
      if (storedIds.includes(productId)) return productId;
      const canonical = toCanonical(productId);
      if (storedIds.includes(canonical)) return canonical;
      for (const stored of storedIds) {
        if (toCanonical(stored) === canonical) return stored;
      }
      return canonical;
    },
    [toCanonical]
  );

  const isWished = useCallback(
    (productId: string) =>
      isProductInCollection(wishIds, productId, products) || isWishedRaw(productId),
    [wishIds, products, isWishedRaw]
  );

  const isOwned = useCallback(
    (productId: string) =>
      isProductInCollection(ownedIds, productId, products) || isOwnedRaw(productId),
    [ownedIds, products, isOwnedRaw]
  );

  const resolveFromListing = useCallback(
    (listing: ListingLike) => resolveProductIdFromListing(listing, products),
    [products]
  );

  const resolveFromTitle = useCallback(
    (title: string) => resolveProductIdFromTitle(title, products),
    [products]
  );

  const resolveStorableId = useCallback(
    (listing: ListingLike & { image?: string }) => resolveCollectionId(listing, products),
    [products]
  );

  const toggleWishFromListing = useCallback(
    (listing: ListingLike & { image?: string }) => {
      toggleWish(resolveCollectionId(listing, products));
    },
    [products, toggleWish]
  );

  const requestWishProduct = useCallback(
    (productId: string) => {
      const canonical = toCanonical(productId);
      if (isWished(productId)) {
        toggleWish(resolveStoredId(productId, wishIds));
      } else {
        toggleWish(canonical);
      }
    },
    [toCanonical, isWished, toggleWish, resolveStoredId, wishIds]
  );

  const toggleOwnedFromListing = useCallback(
    (listing: ListingLike & { image?: string }) => {
      toggleOwned(resolveCollectionId(listing, products));
    },
    [products, toggleOwned]
  );

  const toggleProductOwned = useCallback(
    (productId: string) => {
      const canonical = toCanonical(productId);
      if (isOwned(productId)) {
        toggleOwned(resolveStoredId(productId, ownedIds));
      } else {
        toggleOwned(canonical);
      }
    },
    [toCanonical, isOwned, toggleOwned, resolveStoredId, ownedIds]
  );

  const isListingWished = useCallback(
    (listing: ListingLike & { image?: string }) =>
      isWished(resolveCollectionId(listing, products)),
    [products, isWished]
  );

  const isListingOwned = useCallback(
    (listing: ListingLike & { image?: string }) =>
      isOwned(resolveCollectionId(listing, products)),
    [products, isOwned]
  );

  const wishedProducts = useMemo(
    () => products.filter((p) => isWished(p.id)),
    [products, isWished]
  );

  const ownedProducts = useMemo(
    () => products.filter((p) => isOwned(p.id)),
    [products, isOwned]
  );

  const collectionHierarchy = useMemo(
    () => buildCatalogHierarchy(products, ownedIds, { onlyCollected: true }),
    [products, ownedIds]
  );

  const toggleWishForProductIds = useCallback(
    (productIds: string[]) => {
      if (!productIds.length) return;
      const canonicalIds = productIds.map(toCanonical);
      const allOn = canonicalIds.every((id) => isWished(id));
      for (const id of canonicalIds) {
        if (allOn) {
          if (isWished(id)) toggleWish(id);
        } else if (!isWished(id)) {
          toggleWish(id);
        }
      }
    },
    [isWished, toggleWish, toCanonical]
  );

  const toggleOwnedForProductIds = useCallback(
    (productIds: string[]) => {
      if (!productIds.length) return;
      const canonicalIds = productIds.map(toCanonical);
      const allOn = canonicalIds.every((id) => isOwned(id));
      for (const id of canonicalIds) {
        if (allOn) {
          if (isOwned(id)) toggleOwned(id);
        } else if (!isOwned(id)) {
          toggleOwned(id);
        }
      }
    },
    [isOwned, toggleOwned, toCanonical]
  );

  const isAllWished = useCallback(
    (productIds: string[]) =>
      productIds.length > 0 && productIds.map(toCanonical).every((id) => isWished(id)),
    [isWished, toCanonical]
  );

  const isAllOwned = useCallback(
    (productIds: string[]) =>
      productIds.length > 0 && productIds.map(toCanonical).every((id) => isOwned(id)),
    [isOwned, toCanonical]
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
    toggleProductOwned,
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
