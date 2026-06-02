import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import TopBar from '@/frontend/presentation/components/TopBar';
import UserAvatar from '@/frontend/presentation/components/UserAvatar';
import SellerInfoModal from '@/frontend/presentation/components/SellerInfoModal';
import SwapOfferSection from '@/frontend/presentation/components/SwapOfferSection';
import { createChat } from '@/frontend/infrastructure/api/chatsApi';
import { getListing } from '@/frontend/infrastructure/api/listingsApi';
import { getProfile, getUserProfileById } from '@/frontend/infrastructure/api/profileApi';
import {
  getMySwapProposalForListing,
  getSwapProposalsForListing,
} from '@/frontend/infrastructure/api/swapProposalsApi';
import type { Listing } from '@/frontend/domain/entities/listing';
import type { UserProfile } from '@/frontend/domain/entities/profile';
import type { SwapProposal } from '@/frontend/domain/entities/swapProposal';
import { useAppState } from '@/frontend/presentation/providers/AppStateProvider';
import { useCatalogProducts } from '@/frontend/presentation/hooks/useCatalog';
import PriceTrendChart from '@/frontend/presentation/components/PriceTrendChart';
import { pickBestTitleMatch } from '@/frontend/shared/utils/searchListings';
import {
  hasListingImage,
  resolveListingImages,
} from '@/frontend/shared/utils/listingImage';
import { isOwnListing } from '@/frontend/shared/utils/listingOwnership';
import { isSwapListing } from '@/frontend/shared/utils/tradeMode';
import { cn } from '@/frontend/shared/utils/cn';

export default function ListingDetail() {
  const navigate = useNavigate();
  const { id = '' } = useParams();
  const { addToCart, removeFromCart, isInCart, avatarDataUrl, userId, posts, listings, getPostById } = useAppState();
  const [listing, setListing] = useState<Listing | undefined | null>(null);
  const [loading, setLoading] = useState(!!id);
  const [imageIndex, setImageIndex] = useState(0);
  const { products: catalogProducts } = useCatalogProducts();
  const [contacting, setContacting] = useState(false);
  const [sellerModalOpen, setSellerModalOpen] = useState(false);
  const [sellerProfile, setSellerProfile] = useState<UserProfile | null>(null);
  const [sellerProfileLoading, setSellerProfileLoading] = useState(false);
  const [myProposal, setMyProposal] = useState<SwapProposal | null>(null);
  const [incomingProposals, setIncomingProposals] = useState<SwapProposal[]>([]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getListing(id)
      .then((item) => setListing(item))
      .catch(() => {
        const local = getPostById(id) ?? listings.find((l) => l.id === id);
        setListing(local ?? undefined);
      })
      .finally(() => setLoading(false));
  }, [id, getPostById, listings]);

  const matchedCatalog = useMemo(() => {
    if (!listing) return null;
    const name = (listing.itemName || listing.title || '').trim();
    if (!name) return null;
    return pickBestTitleMatch(catalogProducts, name);
  }, [catalogProducts, listing]);

  const listingImages = useMemo(() => {
    if (!listing) return [];
    return resolveListingImages(listing.images, listing.image);
  }, [listing]);
  const listingUsesPlaceholder = listing ? !hasListingImage(listing.images, listing.image) : false;

  useEffect(() => {
    setImageIndex(0);
  }, [id, listing?.id]);

  const isOwnListingPost = listing ? isOwnListing(listing, userId) : false;
  const isSwapPost = listing ? isSwapListing(listing) : false;
  const canContactSwap = myProposal?.status === 'accepted';

  const sellerListingCount = useMemo(() => {
    if (!listing?.sellerId) return 0;
    return posts.filter((post) => post.sellerId === listing.sellerId).length;
  }, [listing?.sellerId, posts]);

  const refreshSwapData = useCallback(async () => {
    if (!listing || !isSwapListing(listing)) {
      setMyProposal(null);
      setIncomingProposals([]);
      return;
    }
    try {
      if (isOwnListing(listing, userId)) {
        const incoming = await getSwapProposalsForListing(listing.id);
        setIncomingProposals(incoming);
        setMyProposal(null);
      } else {
        const mine = await getMySwapProposalForListing(listing.id);
        setMyProposal(mine);
        setIncomingProposals([]);
      }
    } catch (err) {
      console.error(err);
    }
  }, [listing, userId]);

  useEffect(() => {
    void refreshSwapData();
  }, [refreshSwapData]);

  useEffect(() => {
    if (!listing?.sellerId) {
      setSellerProfile(null);
      return;
    }

    if (isOwnListingPost) {
      let cancelled = false;
      setSellerProfileLoading(true);
      getProfile()
        .then((profile) => {
          if (!cancelled) setSellerProfile(profile);
        })
        .catch(() => {
          if (!cancelled) setSellerProfile(null);
        })
        .finally(() => {
          if (!cancelled) setSellerProfileLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }

    let cancelled = false;
    setSellerProfileLoading(true);
    getUserProfileById(listing.sellerId)
      .then((profile) => {
        if (!cancelled) setSellerProfile(profile);
      })
      .catch(() => {
        if (!cancelled) setSellerProfile(null);
      })
      .finally(() => {
        if (!cancelled) setSellerProfileLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [listing?.sellerId, listing?.sellerName, isOwnListingPost]);

  const sellerPreviewAvatar = isOwnListingPost
    ? avatarDataUrl
    : sellerProfile?.avatarDataUrl ?? null;

  const contactBlockedBySwap = isSwapPost && !isOwnListingPost && !canContactSwap;

  const handleContactSeller = async () => {
    if (!listing || isOwnListingPost || contactBlockedBySwap) return;
    setContacting(true);
    try {
      const chat = await createChat(listing.id);
      setSellerModalOpen(false);
      navigate(`/chat/${chat.id}`);
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : '無法開啟聊天');
    } finally {
      setContacting(false);
    }
  };

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
  const contactLabel = isOwnListingPost
    ? '這是你的貼文'
    : contacting
      ? '開啟中…'
      : contactBlockedBySwap
        ? '需通過交換申請後才能聯絡'
        : '聯絡賣家';

  return (
    <div className="animate-in fade-in duration-500 pb-28">
      <TopBar showBack title="貼文詳情" />
      <main className="pt-topbar-content px-5 space-y-6 w-full min-w-0 max-w-full">
        <section className="rounded-2xl border-2 border-outline bg-white shadow-none overflow-hidden">
          <div className="relative aspect-square bg-neutral-100">
            <img
              src={listingImages[imageIndex] ?? listingImages[0]}
              alt=""
              referrerPolicy="no-referrer"
              className={cn(
                'h-full w-full',
                listingUsesPlaceholder ? 'bg-neutral-50 object-contain p-8' : 'object-cover'
              )}
            />
            {listingImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    setImageIndex((prev) => (prev - 1 + listingImages.length) % listingImages.length)
                  }
                  className="absolute left-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white"
                  aria-label="上一張照片"
                >
                  <span className="material-symbols-outlined">chevron_left</span>
                </button>
                <button
                  type="button"
                  onClick={() => setImageIndex((prev) => (prev + 1) % listingImages.length)}
                  className="absolute right-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white"
                  aria-label="下一張照片"
                >
                  <span className="material-symbols-outlined">chevron_right</span>
                </button>
                <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-1 rounded-full bg-black/45 px-2.5 py-1.5">
                  {listingImages.map((_, idx) => (
                    <span
                      key={`${listing.id}-dot-${idx}`}
                      className={`h-1.5 w-1.5 rounded-full ${
                        idx === imageIndex ? 'bg-white' : 'bg-white/45'
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
          <div className="p-5 space-y-3">
            <h1 className="text-xl font-bold text-on-surface leading-snug">{listing.title}</h1>
            <p className="text-sm text-on-surface-variant">{listing.itemName}</p>
            {isSwapPost ? (
              <p className="text-lg font-black text-primary">可交換</p>
            ) : (
              <p className="text-2xl font-black text-primary">{listing.price}</p>
            )}
            {!isSwapPost && matchedCatalog ? (
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
          <p className="text-sm text-on-surface"><span className="text-on-surface-variant">允許議價：</span>{listing.allowBargain ? '是' : '否'}</p>
          <p className="text-sm text-on-surface"><span className="text-on-surface-variant">商品描述：</span>{listing.description}</p>
        </section>

        {isSwapPost ? (
          <SwapOfferSection
            wantedListing={listing}
            myListings={listings}
            myProposal={myProposal}
            incomingProposals={incomingProposals}
            isSeller={isOwnListingPost}
            onProposalChange={refreshSwapData}
          />
        ) : null}

        <section className="rounded-2xl border-2 border-outline bg-white shadow-none p-5">
          <h2 className="text-sm font-bold text-on-surface uppercase tracking-wider mb-3">賣家資訊</h2>
          <button
            type="button"
            onClick={() => setSellerModalOpen(true)}
            className="flex w-full items-center gap-3 rounded-xl text-left transition-colors active:bg-black/[0.03]"
            aria-label={`查看 ${listing.sellerName} 的賣家資訊`}
          >
            {sellerPreviewAvatar ? (
              <img
                src={sellerPreviewAvatar}
                alt=""
                className="h-12 w-12 rounded-full border border-black/[0.1] object-cover"
              />
            ) : (
              <UserAvatar size="md" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-on-surface">{listing.sellerName}</p>
              <p className="text-xs text-on-surface-variant">
                貼文建立於 {new Date(listing.createdAt).toLocaleDateString()}
              </p>
            </div>
            <span className="material-symbols-outlined shrink-0 text-on-surface-variant">chevron_right</span>
          </button>
        </section>

        <SellerInfoModal
          open={sellerModalOpen}
          onClose={() => setSellerModalOpen(false)}
          profile={sellerProfile}
          loading={sellerProfileLoading && Boolean(listing.sellerId)}
          fallbackName={listing.sellerName}
          listingCreatedAt={listing.createdAt}
          activeListingCount={sellerListingCount}
          showContact={!isOwnListingPost && !contactBlockedBySwap}
          onContact={handleContactSeller}
          contactDisabled={contacting || contactBlockedBySwap}
          contacting={contacting}
        />

        <div className="flex flex-col gap-3">
          <button
            type="button"
            disabled={contacting || isOwnListingPost || contactBlockedBySwap}
            onClick={handleContactSeller}
            className="w-full py-4 rounded-full border-2 border-outline bg-white text-sm font-bold text-on-surface shadow-[4px_4px_0_#111] transition-transform active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:opacity-50"
          >
            {contactLabel}
          </button>
          {!isOwnListingPost && !isSwapPost && (
          <button
            type="button"
            onClick={() => {
              inCart ? removeFromCart(listing.id) : addToCart(listing.id);
            }}
            className={`w-full py-4 rounded-full text-sm font-bold ${
              inCart
                ? 'bg-white border border-black/[0.12] text-on-surface'
                : 'premium-gradient text-white'
            }`}
          >
            {inCart ? '已加入購物車（點我移除）' : '加入購物車'}
          </button>
          )}
        </div>
      </main>
    </div>
  );
}
