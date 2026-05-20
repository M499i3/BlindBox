import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { CreateListingInput, Listing } from '@/frontend/domain/entities/listing';
import { getAppContainer } from '@/frontend/infrastructure/di/getAppContainer';
import { useAppServices } from '@/frontend/presentation/providers/AppServicesProvider';

export type { Listing, CreateListingInput };

type AppStateValue = {
  avatarDataUrl: string | null;
  setAvatarDataUrl: (v: string | null) => Promise<void>;
  listings: Listing[];
  posts: Listing[];
  getPostById: (id: string) => Listing | undefined;
  createListing: (input: CreateListingInput) => Promise<string>;
  cartIds: string[];
  addToCart: (listingId: string) => Promise<void>;
  removeFromCart: (listingId: string) => Promise<void>;
  isInCart: (listingId: string) => boolean;
};

const AppStateContext = createContext<AppStateValue | null>(null);

function syncFromServices(
  listingService: ReturnType<typeof useAppServices>['listingService'],
  cartService: ReturnType<typeof useAppServices>['cartService'],
  profileService: ReturnType<typeof useAppServices>['profileService']
) {
  return {
    listings: listingService.getUserListings(),
    posts: listingService.getAllPosts(),
    cartIds: cartService.getCartListingIds(),
    avatarDataUrl: profileService.getProfile().avatarDataUrl,
  };
}

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const { listingService, cartService, profileService } = useAppServices();

  const [listings, setListings] = useState<Listing[]>([]);
  const [posts, setPosts] = useState<Listing[]>([]);
  const [cartIds, setCartIds] = useState<string[]>([]);
  const [avatarDataUrl, setAvatarDataUrlState] = useState<string | null>(null);

  const refresh = useCallback(() => {
    const snap = syncFromServices(listingService, cartService, profileService);
    setListings(snap.listings);
    setPosts(snap.posts);
    setCartIds(snap.cartIds);
    setAvatarDataUrlState(snap.avatarDataUrl);
  }, [listingService, cartService, profileService]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const setAvatarDataUrl = useCallback(
    async (v: string | null) => {
      await profileService.setAvatar(v);
      refresh();
    },
    [profileService, refresh]
  );

  const createListing = useCallback(
    async (input: CreateListingInput) => {
      const listing = await listingService.createListing(input);
      refresh();
      return listing.id;
    },
    [listingService, refresh]
  );

  const addToCart = useCallback(
    async (listingId: string) => {
      await cartService.addToCart(listingId);
      refresh();
    },
    [cartService, refresh]
  );

  const removeFromCart = useCallback(
    async (listingId: string) => {
      await cartService.removeFromCart(listingId);
      refresh();
    },
    [cartService, refresh]
  );

  const isInCart = useCallback(
    (listingId: string) => cartService.isInCart(listingId),
    [cartService, cartIds]
  );

  const getPostById = useCallback(
    (id: string) => listingService.getPostById(id),
    [listingService, posts]
  );

  const value = useMemo<AppStateValue>(
    () => ({
      avatarDataUrl,
      setAvatarDataUrl,
      listings,
      posts,
      getPostById,
      createListing,
      cartIds,
      addToCart,
      removeFromCart,
      isInCart,
    }),
    [
      avatarDataUrl,
      setAvatarDataUrl,
      listings,
      posts,
      getPostById,
      createListing,
      cartIds,
      addToCart,
      removeFromCart,
      isInCart,
    ]
  );

  return (
    <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
  );
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider');
  return ctx;
}

export function getDefaultListingImage() {
  return getAppContainer().catalogService.getDefaultProductImage();
}
