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
import {
  createListing as apiCreateListing,
  getListings,
  getMyListings,
} from '@/frontend/infrastructure/api/listingsApi';
import { getProfile, updateProfile } from '@/frontend/infrastructure/api/profileApi';
import { useAuth } from '@/frontend/presentation/providers/AuthProvider';
import { isMockDataEnabled, popmartShowcase } from '@/frontend/lib/popmartShowcase';

export type { Listing, CreateListingInput };

const STORAGE_KEY = 'blindbox_app_state_v1';

type AppStateValue = {
  avatarDataUrl: string | null;
  displayName: string;
  setAvatarDataUrl: (v: string | null) => void | Promise<void>;
  listings: Listing[];
  posts: Listing[];
  getPostById: (id: string) => Listing | undefined;
  createListing: (input: CreateListingInput) => Promise<string>;
  cartItems: Listing[];
  cartIds: string[];
  addToCart: (listingId: string) => void | Promise<void>;
  removeFromCart: (listingId: string) => void | Promise<void>;
  isInCart: (listingId: string) => boolean;
  refreshCart?: () => Promise<void>;
  ownedIds: string[];
  toggleOwned: (id: string) => void;
  isOwned: (id: string) => boolean;
  wishIds: string[];
  toggleWish: (id: string) => void;
  isWished: (id: string) => boolean;
};

const AppStateContext = createContext<AppStateValue | null>(null);

function buildSeededPosts(): Listing[] {
  return popmartShowcase.products.map((p, idx) => ({
    id: `pm_${p.id}`,
    title: p.title,
    itemName: p.title,
    price: p.price || 'HK$ 0.00',
    description: '???????????????????????',
    brand: 'Pop Mart',
    series: 'Official',
    condition: idx % 2 === 0 ? '????' : '???',
    tradeMode: idx % 3 === 0 ? '???' : idx % 3 === 1 ? '???' : '???',
    shipping: '7-11 ???',
    allowSwap: true,
    allowBargain: idx % 2 === 0,
    image: p.image,
    createdAt: new Date().toISOString(),
    sellerName: `Seller_${(idx % 8) + 1}`,
    isSeeded: true,
  }));
}

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const mock = isMockDataEnabled();

  const [avatarDataUrl, setAvatarDataUrlState] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [listings, setListings] = useState<Listing[]>([]);
  const [posts, setPosts] = useState<Listing[]>([]);
  const [cartItems, setCartItems] = useState<Listing[]>([]);
  const [cartIds, setCartIds] = useState<string[]>([]);
  const [ownedIds, setOwnedIds] = useState<string[]>([]);
  const [wishIds, setWishIds] = useState<string[]>([]);

  const seededPosts = useMemo(() => (mock ? buildSeededPosts() : []), [mock]);

  // Restore ownedIds / wishIds (and mock-only listings/cartIds) from localStorage
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as {
        avatarDataUrl?: string | null;
        displayName?: string;
        listings?: Listing[];
        cartIds?: string[];
        ownedIds?: string[];
        wishIds?: string[];
      };
      setOwnedIds(parsed.ownedIds ?? []);
      setWishIds(parsed.wishIds ?? []);
      if (mock) {
        setAvatarDataUrlState(parsed.avatarDataUrl ?? null);
        if (parsed.displayName) setDisplayName(parsed.displayName);
        setListings(parsed.listings ?? []);
        setCartIds(parsed.cartIds ?? []);
      }
    } catch {
      // ignore malformed local data
    }
  }, [mock]);

  // Persist state to localStorage
  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        avatarDataUrl: mock ? avatarDataUrl : undefined,
        displayName: mock ? displayName : undefined,
        listings: mock ? listings : undefined,
        cartIds: mock ? cartIds : undefined,
        ownedIds,
        wishIds,
      })
    );
  }, [avatarDataUrl, displayName, listings, cartIds, ownedIds, wishIds, mock]);

  const loadUserProfile = useCallback(async () => {
    const profile = await getProfile();
    setAvatarDataUrlState(profile.avatarDataUrl);
    setDisplayName(profile.displayName);
  }, []);

  // Load marketplace data when authenticated (non-mock mode)
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
      setDisplayName(mock ? 'Yu' : '');
      return;
    }
    if (user?.displayName) setDisplayName(user.displayName);
    if (mock) {
      loadUserProfile().catch(console.error);
    } else {
      loadUserData().catch(console.error);
    }
  }, [isAuthenticated, authLoading, user?.id, user?.displayName, loadUserProfile, loadUserData, mock]);

  const allPosts = useMemo(
    () => (mock ? [...listings, ...seededPosts] : posts),
    [mock, listings, seededPosts, posts]
  );

  const refreshCart = useCallback(async () => {
    if (mock) return;
    const items = await getCart();
    setCartItems(items);
  }, [mock]);

  const setAvatarDataUrl = useCallback(
    async (v: string | null) => {
      if (mock) {
        setAvatarDataUrlState(v);
        return;
      }
      await updateProfile({ avatarDataUrl: v });
      setAvatarDataUrlState(v);
    },
    [mock]
  );

  const createListing = useCallback(
    async (input: CreateListingInput) => {
      if (mock) {
        const id = `l_${Date.now()}`;
        const next: Listing = {
          ...input,
          id,
          createdAt: new Date().toISOString(),
          sellerName: displayName || 'Yu',
        };
        setListings((prev) => [next, ...prev]);
        return id;
      }
      const listing = await apiCreateListing(input);
      setListings((prev) => [listing, ...prev]);
      setPosts((prev) => [listing, ...prev]);
      return listing.id;
    },
    [mock, displayName]
  );

  const addToCart = useCallback(
    async (listingId: string) => {
      if (mock) {
        setCartIds((prev) => (prev.includes(listingId) ? prev : [...prev, listingId]));
        return;
      }
      await apiAddToCart(listingId);
      await refreshCart();
    },
    [mock, refreshCart]
  );

  const removeFromCart = useCallback(
    async (listingId: string) => {
      if (mock) {
        setCartIds((prev) => prev.filter((id) => id !== listingId));
        return;
      }
      await apiRemoveFromCart(listingId);
      setCartItems((prev) => prev.filter((i) => i.id !== listingId));
    },
    [mock]
  );

  const resolvedCartIds = useMemo(
    () => (mock ? cartIds : cartItems.map((i) => i.id)),
    [mock, cartIds, cartItems]
  );

  const isInCart = useCallback(
    (listingId: string) => resolvedCartIds.includes(listingId),
    [resolvedCartIds]
  );

  const toggleOwned = useCallback((id: string) => {
    setOwnedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  const isOwned = useCallback((id: string) => ownedIds.includes(id), [ownedIds]);

  const toggleWish = useCallback((id: string) => {
    setWishIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  const isWished = useCallback((id: string) => wishIds.includes(id), [wishIds]);

  const getPostById = useCallback(
    (id: string) => allPosts.find((p) => p.id === id),
    [allPosts]
  );

  const value = useMemo<AppStateValue>(
    () => ({
      avatarDataUrl,
      displayName,
      setAvatarDataUrl,
      listings,
      posts: allPosts,
      getPostById,
      createListing,
      cartItems: mock ? allPosts.filter((p) => resolvedCartIds.includes(p.id)) : cartItems,
      cartIds: resolvedCartIds,
      addToCart,
      removeFromCart,
      isInCart,
      refreshCart: mock ? undefined : refreshCart,
      ownedIds,
      toggleOwned,
      isOwned,
      wishIds,
      toggleWish,
      isWished,
    }),
    [
      avatarDataUrl,
      displayName,
      setAvatarDataUrl,
      listings,
      allPosts,
      getPostById,
      createListing,
      cartItems,
      resolvedCartIds,
      addToCart,
      removeFromCart,
      isInCart,
      refreshCart,
      mock,
      ownedIds,
      toggleOwned,
      isOwned,
      wishIds,
      toggleWish,
      isWished,
    ]
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider');
  return ctx;
}

export function getDefaultListingImage(): string {
  return (
    popmartShowcase.products[0]?.image ??
    'https://global-static.popmart.com/globalAdmin/1776844373939____pc____.jpg?x-oss-process=image/resize,w_800/quality,q_85/format,webp'
  );
}
