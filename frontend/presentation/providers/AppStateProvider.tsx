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
  deleteListing as apiDeleteListing,
  getListings,
  getMyListings,
  updateListing as apiUpdateListing,
} from '@/frontend/infrastructure/api/listingsApi';
import { getMyOrders } from '@/frontend/infrastructure/api/ordersApi';
import { invalidateCachesAfterListingPublish } from '@/frontend/shared/utils/cacheInvalidation';
import {
  addCollectionItem,
  getCollections,
  removeCollectionItem,
} from '@/frontend/infrastructure/api/collectionsApi';
import { getProfile, updateProfile } from '@/frontend/infrastructure/api/profileApi';
import { useAuth } from '@/frontend/presentation/providers/AuthProvider';
import { createDefaultWishAlertSettings, type WishAlertSettings } from '@/frontend/domain/entities/wishAlert';
import { getLowestMarketPriceForTitle } from '@/frontend/shared/utils/marketPrice';
import { isMockDataEnabled, popmartShowcase } from '@/frontend/lib/popmartShowcase';
import { isLocalOnlyCollectionId, mergeServerCollectionIds } from '@/frontend/shared/utils/productCollection';
export type { Listing, CreateListingInput };
export type { WishAlertSettings };

const STORAGE_KEY = 'blindbox_app_state_v1';

type AppStateValue = {
  avatarDataUrl: string | null;
  displayName: string;
  userId: string;
  displayId: string;
  ratingAvg: number;
  ratingCount: number;
  transactionCount: number;
  /** null = 尚未從 API 載入（避免誤顯示 0） */
  purchaseCount: number | null;
  sellCount: number | null;
  refreshOrderCounts: () => Promise<void>;
  /** 強制從 API 重載貼文、購物車、個人資料等 */
  refreshUserData: () => Promise<void>;
  setAvatarDataUrl: (v: string | null) => void | Promise<void>;
  listings: Listing[];
  posts: Listing[];
  getPostById: (id: string) => Listing | undefined;
  createListing: (input: CreateListingInput) => Promise<string>;
  updateListing: (id: string, input: CreateListingInput) => Promise<void>;
  deleteListing: (id: string) => Promise<void>;
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
  /** 批次覆寫（用於舊資料遷移至圖鑑 product id） */
  replaceOwnedIds: (ids: string[]) => void;
  replaceWishIds: (ids: string[]) => void;
  wishAlerts: Record<string, WishAlertSettings>;
  getWishAlert: (productId: string) => WishAlertSettings | undefined;
  setWishAlert: (productId: string, settings: WishAlertSettings) => void;
  confirmWishWithSettings: (productId: string, settings: WishAlertSettings) => void;
  addWishWithDefaultSettings: (productId: string, title: string) => void;
  wantModalOpen: boolean;
  wantModalProductId: string | null;
  wantModalListing: Pick<Listing, 'id' | 'title' | 'itemName' | 'image'> | null;
  openWantModal: (options?: {
    productId?: string | null;
    listing?: Pick<Listing, 'id' | 'title' | 'itemName' | 'image'> | null;
  }) => void;
  closeWantModal: () => void;
};

const AppStateContext = createContext<AppStateValue | null>(null);

function buildSeededPosts(): Listing[] {
  return popmartShowcase.products.map((p, idx) => ({
    id: `pm_${p.id}`,
    title: p.title,
    itemName: p.title,
    price: p.price || 'HK$ 0.00',
    description: '來自官方圖鑑資料的示意貼文（可直接查看詳情）。',
    brand: 'Pop Mart',
    series: 'Official',
    condition: idx % 2 === 0 ? '全新未拆' : '已拆盒',
    tradeMode: idx % 3 === 0 ? '我想換' : idx % 3 === 1 ? '我要拆' : '我要賣',
    shipping: '7-11 店到店',
    allowSwap: idx % 3 === 0,
    allowBargain: idx % 2 === 0,
    quantity: 1,
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
  const [userId, setUserId] = useState('');
  const [displayId, setDisplayId] = useState('');
  const [ratingAvg, setRatingAvg] = useState(0);
  const [ratingCount, setRatingCount] = useState(0);
  const [transactionCount, setTransactionCount] = useState(0);
  const [purchaseCount, setPurchaseCount] = useState<number | null>(null);
  const [sellCount, setSellCount] = useState<number | null>(null);

  const [listings, setListings] = useState<Listing[]>([]);
  const [posts, setPosts] = useState<Listing[]>([]);
  const [cartItems, setCartItems] = useState<Listing[]>([]);
  const [cartIds, setCartIds] = useState<string[]>([]);
  const [ownedIds, setOwnedIds] = useState<string[]>([]);
  const [wishIds, setWishIds] = useState<string[]>([]);
  const [wishAlerts, setWishAlerts] = useState<Record<string, WishAlertSettings>>({});
  const [wantModalOpen, setWantModalOpen] = useState(false);
  const [wantModalProductId, setWantModalProductId] = useState<string | null>(null);
  const [wantModalListing, setWantModalListing] = useState<Pick<
    Listing,
    'id' | 'title' | 'itemName' | 'image'
  > | null>(null);

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
        wishAlerts?: Record<string, WishAlertSettings>;
      };
      setOwnedIds(parsed.ownedIds ?? []);
      setWishIds(parsed.wishIds ?? []);
      setWishAlerts(parsed.wishAlerts ?? {});
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
        wishAlerts,
      })
    );
  }, [avatarDataUrl, displayName, listings, cartIds, ownedIds, wishIds, wishAlerts, mock]);

  const applyProfile = useCallback((profile: Awaited<ReturnType<typeof getProfile>>) => {
    setAvatarDataUrlState(profile.avatarDataUrl);
    setDisplayName(profile.displayName);
    setUserId(profile.id);
    setDisplayId(profile.displayId);
    setRatingAvg(profile.ratingAvg);
    setRatingCount(profile.ratingCount);
    setTransactionCount(profile.transactionCount);
  }, []);

  const refreshOrderCounts = useCallback(async () => {
    if (mock) return;
    try {
      const [buyerOrders, sellerOrders] = await Promise.all([
        getMyOrders('buyer'),
        getMyOrders('seller'),
      ]);
      setPurchaseCount(buyerOrders.length);
      setSellCount(sellerOrders.length);
    } catch (err) {
      console.error(err);
    }
  }, [mock]);

  const loadUserProfile = useCallback(async () => {
    const profile = await getProfile();
    applyProfile(profile);
  }, [applyProfile]);

  // Load marketplace data when authenticated (non-mock mode)
  const loadUserData = useCallback(async () => {
    const [postsData, mine, cart, profile, collections, buyerOrders, sellerOrders] =
      await Promise.all([
        getListings(),
        getMyListings(),
        getCart(),
        getProfile(),
        getCollections(),
        getMyOrders('buyer'),
        getMyOrders('seller'),
      ]);
    setPosts(postsData);
    setListings(mine);
    setCartItems(cart);
    applyProfile(profile);
    setPurchaseCount(buyerOrders.length);
    setSellCount(sellerOrders.length);
    setOwnedIds((prev) =>
      mergeServerCollectionIds(collections.collected, prev.filter(isLocalOnlyCollectionId))
    );
    setWishIds((prev) =>
      mergeServerCollectionIds(collections.wishlist, prev.filter(isLocalOnlyCollectionId))
    );
  }, [applyProfile]);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      setPosts([]);
      setListings([]);
      setCartItems([]);
      setAvatarDataUrlState(null);
      setDisplayName(mock ? 'Yu' : '');
      setUserId('');
      setDisplayId('');
      setRatingAvg(0);
      setRatingCount(0);
      setTransactionCount(0);
      setPurchaseCount(null);
      setSellCount(null);
      return;
    }
    if (user?.displayName) setDisplayName(user.displayName);
    if (mock) {
      loadUserProfile().catch(console.error);
    } else {
      loadUserData().catch(console.error);
    }
  }, [isAuthenticated, authLoading, user?.id, user?.displayName, loadUserProfile, loadUserData, mock]);

  const syncCollectionToggle = useCallback(
    async (productId: string, type: 'collected' | 'wishlist', currentlyOn: boolean) => {
      const data = currentlyOn
        ? await removeCollectionItem(productId, type)
        : await addCollectionItem(productId, type);
      setOwnedIds((prev) =>
        mergeServerCollectionIds(
          data.collected,
          prev.filter(isLocalOnlyCollectionId)
        )
      );
      setWishIds((prev) =>
        mergeServerCollectionIds(
          data.wishlist,
          prev.filter(isLocalOnlyCollectionId)
        )
      );
    },
    []
  );

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
      invalidateCachesAfterListingPublish();
      void loadUserData();
      return listing.id;
    },
    [mock, displayName, loadUserData]
  );

  const updateListing = useCallback(
    async (id: string, input: CreateListingInput) => {
      if (mock) {
        const patch = (prev: Listing[]) =>
          prev.map((l) =>
            l.id === id
              ? {
                  ...l,
                  ...input,
                  sellerName: l.sellerName,
                }
              : l
          );
        setListings(patch);
        setPosts(patch);
        return;
      }
      const listing = await apiUpdateListing(id, input);
      const merge = (prev: Listing[]) =>
        prev.map((l) => (l.id === id ? listing : l));
      setListings(merge);
      setPosts(merge);
      invalidateCachesAfterListingPublish();
      void loadUserData();
    },
    [mock, loadUserData]
  );

  const deleteListing = useCallback(
    async (id: string) => {
      if (mock) {
        setListings((prev) => prev.filter((l) => l.id !== id));
        setPosts((prev) => prev.filter((l) => l.id !== id));
        setCartIds((prev) => prev.filter((x) => x !== id));
        return;
      }
      await apiDeleteListing(id);
      setListings((prev) => prev.filter((l) => l.id !== id));
      setPosts((prev) => prev.filter((l) => l.id !== id));
      setCartItems((prev) => prev.filter((l) => l.id !== id));
      invalidateCachesAfterListingPublish();
      void loadUserData();
    },
    [mock, loadUserData]
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

  const toggleOwned = useCallback(
    (id: string) => {
      setOwnedIds((prev) => {
        const currentlyOn = prev.includes(id);
        const next = currentlyOn ? prev.filter((x) => x !== id) : [...prev, id];
        if (!mock && !isLocalOnlyCollectionId(id)) {
          syncCollectionToggle(id, 'collected', currentlyOn).catch((err) => {
            console.error(err);
            setOwnedIds((rollback) =>
              currentlyOn ? [...rollback, id] : rollback.filter((x) => x !== id)
            );
          });
        }
        return next;
      });
    },
    [mock, syncCollectionToggle]
  );

  const toggleWish = useCallback(
    (id: string) => {
      setWishIds((prev) => {
        const currentlyOn = prev.includes(id);
        const next = currentlyOn ? prev.filter((x) => x !== id) : [...prev, id];
        if (!mock && !isLocalOnlyCollectionId(id)) {
          syncCollectionToggle(id, 'wishlist', currentlyOn).catch((err) => {
            console.error(err);
            setWishIds((rollback) =>
              currentlyOn ? [...rollback, id] : rollback.filter((x) => x !== id)
            );
          });
        }
        return next;
      });
    },
    [mock, syncCollectionToggle]
  );

  const isOwned = useCallback((id: string) => ownedIds.includes(id), [ownedIds]);

  const isWished = useCallback((id: string) => wishIds.includes(id), [wishIds]);

  const replaceOwnedIds = useCallback((ids: string[]) => {
    setOwnedIds(ids);
  }, []);

  const replaceWishIds = useCallback((ids: string[]) => {
    setWishIds(ids);
  }, []);

  const getWishAlert = useCallback(
    (productId: string) => wishAlerts[productId],
    [wishAlerts]
  );

  const setWishAlert = useCallback((productId: string, settings: WishAlertSettings) => {
    setWishAlerts((prev) => ({ ...prev, [productId]: settings }));
  }, []);

  const confirmWishWithSettings = useCallback(
    (productId: string, settings: WishAlertSettings) => {
      if (mock) {
        setWishIds((prev) => (prev.includes(productId) ? prev : [...prev, productId]));
      } else {
        addCollectionItem(productId, 'wishlist')
          .then((data) => {
            setOwnedIds((prev) =>
              mergeServerCollectionIds(data.collected, prev.filter(isLocalOnlyCollectionId))
            );
            setWishIds((prev) =>
              mergeServerCollectionIds(data.wishlist, prev.filter(isLocalOnlyCollectionId))
            );
          })
          .catch(console.error);
      }
      setWishAlerts((prev) => ({ ...prev, [productId]: settings }));
      setWantModalOpen(false);
      setWantModalProductId(null);
      setWantModalListing(null);
    },
    [mock]
  );

  const addWishWithDefaultSettings = useCallback(
    (productId: string, title: string) => {
      if (!productId || wishIds.includes(productId)) return;
      const lowest = getLowestMarketPriceForTitle(title, allPosts);
      const settings = createDefaultWishAlertSettings(lowest);
      if (mock) {
        setWishIds((prev) => [...prev, productId]);
      } else {
        addCollectionItem(productId, 'wishlist')
          .then((data) => {
            setOwnedIds((prev) =>
              mergeServerCollectionIds(data.collected, prev.filter(isLocalOnlyCollectionId))
            );
            setWishIds((prev) =>
              mergeServerCollectionIds(data.wishlist, prev.filter(isLocalOnlyCollectionId))
            );
          })
          .catch(console.error);
      }
      setWishAlerts((prev) => ({ ...prev, [productId]: settings }));
    },
    [wishIds, allPosts, mock]
  );

  const openWantModal = useCallback(
    (options?: {
      productId?: string | null;
      listing?: Pick<Listing, 'id' | 'title' | 'itemName' | 'image'> | null;
    }) => {
      setWantModalProductId(options?.productId ?? null);
      setWantModalListing(options?.listing ?? null);
      setWantModalOpen(true);
    },
    []
  );

  const closeWantModal = useCallback(() => {
    setWantModalOpen(false);
    setWantModalProductId(null);
    setWantModalListing(null);
  }, []);

  const getPostById = useCallback(
    (id: string) => allPosts.find((p) => p.id === id),
    [allPosts]
  );

  const value = useMemo<AppStateValue>(
    () => ({
      avatarDataUrl,
      displayName,
      userId,
      displayId,
      ratingAvg,
      ratingCount,
      transactionCount,
      purchaseCount,
      sellCount,
      refreshOrderCounts,
      refreshUserData: loadUserData,
      setAvatarDataUrl,
      listings,
      posts: allPosts,
      getPostById,
      createListing,
      updateListing,
      deleteListing,
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
      replaceOwnedIds,
      replaceWishIds,
      wishAlerts,
      getWishAlert,
      setWishAlert,
      confirmWishWithSettings,
      addWishWithDefaultSettings,
      wantModalOpen,
      wantModalProductId,
      openWantModal,
      closeWantModal,
    }),
    [
      avatarDataUrl,
      displayName,
      userId,
      displayId,
      ratingAvg,
      ratingCount,
      transactionCount,
      purchaseCount,
      sellCount,
      refreshOrderCounts,
      loadUserData,
      setAvatarDataUrl,
      listings,
      allPosts,
      getPostById,
      createListing,
      updateListing,
      deleteListing,
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
      replaceOwnedIds,
      replaceWishIds,
      wishAlerts,
      getWishAlert,
      setWishAlert,
      confirmWishWithSettings,
      addWishWithDefaultSettings,
      wantModalOpen,
      wantModalProductId,
      wantModalListing,
      openWantModal,
      closeWantModal,
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
