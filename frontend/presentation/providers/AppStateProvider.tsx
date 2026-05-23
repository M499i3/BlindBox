import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { CreateListingInput, Listing } from '@/frontend/domain/entities/listing';
import {
  addToCart as apiAddToCart,
  getCart,
  removeFromCart as apiRemoveFromCart,
} from '@/frontend/infrastructure/api/cartApi';
import { createListing as apiCreateListing, getListings, getMyListings } from '@/frontend/infrastructure/api/listingsApi';
import { getProfile, updateProfile } from '@/frontend/infrastructure/api/profileApi';
import { useAuth } from '@/frontend/presentation/providers/AuthProvider';

export type { Listing, CreateListingInput };

type AppStateValue = {
  avatarDataUrl: string | null;
  displayName: string;
  setAvatarDataUrl: (v: string | null) => Promise<void>;
  listings: Listing[];
  posts: Listing[];
  getPostById: (id: string) => Listing | undefined;
  createListing: (input: CreateListingInput) => Promise<string>;
  cartItems: Listing[];
  cartIds: string[];
  addToCart: (listingId: string) => Promise<void>;
  removeFromCart: (listingId: string) => Promise<void>;
  isInCart: (listingId: string) => boolean;
  refreshCart: () => Promise<void>;
};

const AppStateContext = createContext<AppStateValue | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [posts, setPosts] = useState<Listing[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [cartItems, setCartItems] = useState<Listing[]>([]);
  const [avatarDataUrl, setAvatarDataUrlState] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');

  const loadUserData = useCallback(async () => {
    const [postsData, mine, cart, profile] = await Promise.all([
      getListings(),
      getMyListings(),
      getCart(),
      getProfile(),
    ]);
    setPosts(postsData);
    setListings(mine);
    setCartItems(cart);
    setAvatarDataUrlState(profile.avatarDataUrl);
    setDisplayName(profile.displayName);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      setPosts([]);
      setListings([]);
      setCartItems([]);
      setAvatarDataUrlState(null);
      setDisplayName(user?.displayName ?? '');
      return;
    }
    loadUserData().catch(console.error);
  }, [isAuthenticated, authLoading, user?.id, loadUserData, user?.displayName]);

  const refreshCart = useCallback(async () => {
    const items = await getCart();
    setCartItems(items);
  }, []);

  const setAvatarDataUrl = useCallback(
    async (v: string | null) => {
      await updateProfile({ avatarDataUrl: v });
      setAvatarDataUrlState(v);
    },
    []
  );

  const createListing = useCallback(async (input: CreateListingInput) => {
    const listing = await apiCreateListing(input);
    setListings((prev) => [listing, ...prev]);
    setPosts((prev) => [listing, ...prev]);
    return listing.id;
  }, []);

  const addToCart = useCallback(async (listingId: string) => {
    await apiAddToCart(listingId);
    await refreshCart();
  }, [refreshCart]);

  const removeFromCart = useCallback(async (listingId: string) => {
    await apiRemoveFromCart(listingId);
    setCartItems((prev) => prev.filter((i) => i.id !== listingId));
  }, []);

  const cartIds = useMemo(() => cartItems.map((i) => i.id), [cartItems]);

  const isInCart = useCallback(
    (listingId: string) => cartIds.includes(listingId),
    [cartIds]
  );

  const getPostById = useCallback(
    (id: string) => posts.find((p) => p.id === id),
    [posts]
  );

  const value = useMemo<AppStateValue>(
    () => ({
      avatarDataUrl,
      displayName,
      setAvatarDataUrl,
      listings,
      posts,
      getPostById,
      createListing,
      cartItems,
      cartIds,
      addToCart,
      removeFromCart,
      isInCart,
      refreshCart,
    }),
    [
      avatarDataUrl,
      displayName,
      setAvatarDataUrl,
      listings,
      posts,
      getPostById,
      createListing,
      cartItems,
      cartIds,
      addToCart,
      removeFromCart,
      isInCart,
      refreshCart,
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

/** 取得預設上架圖片（從第一筆貼文，或空字串） */
export function getDefaultListingImage(): string {
  return '';
}
