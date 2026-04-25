import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { popmartShowcase } from '@/src/lib/popmartShowcase';

export type Listing = {
  id: string;
  title: string;
  itemName: string;
  price: string;
  description: string;
  brand: string;
  series: string;
  condition: string;
  tradeMode: string;
  shipping: string;
  allowSwap: boolean;
  allowBargain: boolean;
  image: string;
  createdAt: string;
  sellerName: string;
  isSeeded?: boolean;
};

type AppStateValue = {
  avatarDataUrl: string | null;
  setAvatarDataUrl: (v: string | null) => void;
  listings: Listing[];
  posts: Listing[];
  getPostById: (id: string) => Listing | undefined;
  createListing: (input: Omit<Listing, 'id' | 'createdAt' | 'sellerName'>) => string;
  cartIds: string[];
  addToCart: (listingId: string) => void;
  removeFromCart: (listingId: string) => void;
  isInCart: (listingId: string) => boolean;
};

const STORAGE_KEY = 'blindbox_app_state_v1';

const AppStateContext = createContext<AppStateValue | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [cartIds, setCartIds] = useState<string[]>([]);

  const seededPosts = useMemo<Listing[]>(
    () =>
      popmartShowcase.products.map((p, idx) => ({
        id: `pm_${p.id}`,
        title: p.title,
        itemName: p.title,
        price: p.price || 'HK$ 0.00',
        description: '來自官方圖鑑資料的示意貼文（可直接查看詳情）。',
        brand: 'Pop Mart',
        series: 'Official',
        condition: idx % 2 === 0 ? '全新未拆' : '已拆盒',
        tradeMode: idx % 3 === 0 ? '我想換' : '我要賣',
        shipping: '7-11 店到店',
        allowSwap: true,
        allowBargain: idx % 2 === 0,
        image: p.image,
        createdAt: new Date().toISOString(),
        sellerName: `Seller_${(idx % 8) + 1}`,
        isSeeded: true,
      })),
    []
  );

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as {
        avatarDataUrl?: string | null;
        listings?: Listing[];
        cartIds?: string[];
      };
      setAvatarDataUrl(parsed.avatarDataUrl ?? null);
      setListings(parsed.listings ?? []);
      setCartIds(parsed.cartIds ?? []);
    } catch {
      // ignore malformed local data
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ avatarDataUrl, listings, cartIds })
    );
  }, [avatarDataUrl, listings, cartIds]);

  const createListing = (input: Omit<Listing, 'id' | 'createdAt' | 'sellerName'>) => {
    const id = `l_${Date.now()}`;
    const next: Listing = {
      ...input,
      id,
      createdAt: new Date().toISOString(),
      sellerName: 'Yu',
    };
    setListings((prev) => [next, ...prev]);
    return id;
  };

  const addToCart = (listingId: string) => {
    setCartIds((prev) => (prev.includes(listingId) ? prev : [...prev, listingId]));
  };

  const removeFromCart = (listingId: string) => {
    setCartIds((prev) => prev.filter((id) => id !== listingId));
  };

  const isInCart = (listingId: string) => cartIds.includes(listingId);
  const posts = useMemo(() => [...listings, ...seededPosts], [listings, seededPosts]);
  const getPostById = (id: string) => posts.find((p) => p.id === id);

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
    [avatarDataUrl, listings, posts, cartIds]
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider');
  return ctx;
}

export function getDefaultListingImage() {
  return (
    popmartShowcase.products[0]?.image ??
    'https://global-static.popmart.com/globalAdmin/1776844373939____pc____.jpg?x-oss-process=image/resize,w_800/quality,q_85/format,webp'
  );
}
