import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import TopBar from '@/frontend/presentation/components/TopBar';
import UserAvatar from '@/frontend/presentation/components/UserAvatar';
import { createChat } from '@/frontend/infrastructure/api/chatsApi';
import { getListing } from '@/frontend/infrastructure/api/listingsApi';
import type { Listing } from '@/frontend/domain/entities/listing';
import { useAppState } from '@/frontend/presentation/providers/AppStateProvider';
import { useCatalogProducts } from '@/frontend/presentation/hooks/useCatalog';
import PriceTrendChart from '@/frontend/presentation/components/PriceTrendChart';
import { pickBestTitleMatch } from '@/frontend/shared/utils/searchListings';

export default function ListingDetail() {
  const navigate = useNavigate();
  const { id = '' } = useParams();
  const { getPostById, addToCart, removeFromCart, isInCart, avatarDataUrl, listings } = useAppState();
  const cached = getPostById(id);
  const [listing, setListing] = useState<Listing | undefined | null>(cached ?? null);
  const [loading, setLoading] = useState(!cached && !!id);
  const { products: catalogProducts } = useCatalogProducts();
  const [contacting, setContacting] = useState(false);
  const isOwnListing = listings.some((l) => l.id === id);

  useEffect(() => {
    if (cached) {
      setListing(cached);
      setLoading(false);
      return;
    }
    if (!id) return;
    setLoading(true);
    getListing(id)
      .then((item) => setListing(item))
      .catch(() => setListing(undefined))
      .finally(() => setLoading(false));
  }, [id, cached]);

  const matchedCatalog = useMemo(() => {
    if (!listing) return null;
    const name = (listing.itemName || listing.title || '').trim();
    if (!name) return null;
    return pickBestTitleMatch(catalogProducts, name);
  }, [catalogProducts, listing]);

  if (loading) {
    return (
      <div className="min-h-screen pt-24 px-6 text-center">
        <p className="text-sm text-on-surface-variant">載入中…</p>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen pt-24 px-6 text-center">
        <p className="text-sm text-on-surface-variant mb-4">找不到這篇貼文，可能已被刪除。</p>
        <button type="button" onClick={() => navigate('/')} className="premium-gradient text-white px-6 py-3 rounded-full text-sm font-bold">
          回市集
        </button>
      </div>
    );
  }

  const inCart = isInCart(listing.id);

  return (
    <div className="animate-in fade-in duration-500 pb-28">
      <TopBar showBack title="貼文詳情" />
      <main className="pt-topbar-content px-5 space-y-6 w-full min-w-0 max-w-full">
        <section className="rounded-2xl border-2 border-outline bg-white shadow-none overflow-hidden">
          <div className="aspect-square bg-neutral-100">
            <img src={listing.image} alt="" className="w-full h-full object-cover" />
          </div>
          <div className="p-5 space-y-3">
            <h1 className="text-xl font-bold text-on-surface leading-snug">{listing.title}</h1>
            <p className="text-sm text-on-surface-variant">{listing.itemName}</p>
            <p className="text-2xl font-black text-primary">{listing.price}</p>
            {matchedCatalog ? (
              <PriceTrendChart seed={matchedCatalog.id} currentPriceText={listing.price} />
            ) : null}
          </div>
        </section>

        <section className="rounded-2xl border-2 border-outline bg-white shadow-none p-5 space-y-3">
          <h2 className="text-sm font-bold text-on-surface uppercase tracking-wider">貼文資訊</h2>
          <p className="text-sm text-on-surface"><span className="text-on-surface-variant">品牌：</span>{listing.brand}</p>
          <p className="text-sm text-on-surface"><span className="text-on-surface-variant">系列：</span>{listing.series}</p>
          <p className="text-sm text-on-surface"><span className="text-on-surface-variant">狀態：</span>{listing.condition}</p>
          <p className="text-sm text-on-surface"><span className="text-on-surface-variant">交易方式：</span>{listing.tradeMode}</p>
          <p className="text-sm text-on-surface"><span className="text-on-surface-variant">出貨方式：</span>{listing.shipping}</p>
          <p className="text-sm text-on-surface"><span className="text-on-surface-variant">開放交換：</span>{listing.allowSwap ? '是' : '否'}</p>
          <p className="text-sm text-on-surface"><span className="text-on-surface-variant">允許議價：</span>{listing.allowBargain ? '是' : '否'}</p>
          <p className="text-sm text-on-surface"><span className="text-on-surface-variant">商品描述：</span>{listing.description}</p>
        </section>

        <section className="rounded-2xl border-2 border-outline bg-white shadow-none p-5">
          <h2 className="text-sm font-bold text-on-surface uppercase tracking-wider mb-3">賣家資訊</h2>
          <div className="flex items-center gap-3">
            {avatarDataUrl && !listing.isSeeded ? (
              <img src={avatarDataUrl} alt="" className="w-12 h-12 rounded-full object-cover border border-black/[0.1]" />
            ) : (
              <UserAvatar size="md" />
            )}
            <div>
              <p className="text-sm font-bold text-on-surface">{listing.sellerName}</p>
              <p className="text-xs text-on-surface-variant">貼文建立於 {new Date(listing.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
        </section>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            disabled={contacting || isOwnListing}
            onClick={async () => {
              if (isOwnListing) return;
              setContacting(true);
              try {
                const chat = await createChat(listing.id);
                navigate(`/chat/${chat.id}`);
              } catch (e) {
                console.error(e);
              } finally {
                setContacting(false);
              }
            }}
            className="w-full py-4 rounded-full border-2 border-outline bg-white text-sm font-bold text-on-surface shadow-[4px_4px_0_#111] transition-transform active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:opacity-50"
          >
            {isOwnListing ? '這是你的貼文' : contacting ? '開啟中…' : '聯絡賣家'}
          </button>
          <button
            type="button"
            onClick={() => (inCart ? removeFromCart(listing.id) : addToCart(listing.id))}
            className={`w-full py-4 rounded-full text-sm font-bold ${inCart ? 'bg-white border border-black/[0.12] text-on-surface' : 'premium-gradient text-white'}`}
          >
            {inCart ? '已加入購物車（點我移除）' : '加入購物車'}
          </button>
        </div>
      </main>
    </div>
  );
}
