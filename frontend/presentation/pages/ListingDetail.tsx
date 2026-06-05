import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { navigateWithReturn } from '@/frontend/shared/utils/routeNavigation';
import TopBar from '@/frontend/presentation/components/TopBar';
import UserAvatar from '@/frontend/presentation/components/UserAvatar';
import SellerInfoModal from '@/frontend/presentation/components/SellerInfoModal';
import SwapOfferSection from '@/frontend/presentation/components/SwapOfferSection';
import { createChat } from '@/frontend/infrastructure/api/chatsApi';
import { getListing } from '@/frontend/infrastructure/api/listingsApi';
import { listingShippingOptions } from '@/frontend/shared/utils/listingShipping';
import { getProfile, getUserProfileById } from '@/frontend/infrastructure/api/profileApi';
import {
  getMySwapProposalForListing,
  getSwapProposalsForListing,
} from '@/frontend/infrastructure/api/swapProposalsApi';
import type { Listing } from '@/frontend/domain/entities/listing';
import type { UserProfile } from '@/frontend/domain/entities/profile';
import type { SwapProposal } from '@/frontend/domain/entities/swapProposal';
import { useAppState } from '@/frontend/presentation/providers/AppStateProvider';
import {
  hasListingImage,
  resolveListingImages,
} from '@/frontend/shared/utils/listingImage';
import { isOwnListing } from '@/frontend/shared/utils/listingOwnership';
import { getSplitBox } from '@/frontend/infrastructure/api/splitBoxApi';
import {
  SPLIT_BOX_STATUS_LABEL,
  type SplitBoxGroupDetail,
} from '@/frontend/domain/entities/splitBox';
import { isSplitBoxListing, isSwapListing, listingTradeKind } from '@/frontend/shared/utils/tradeMode';
import { cn } from '@/frontend/shared/utils/cn';

export default function ListingDetail() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id = '' } = useParams();
  const {
    addToCart,
    removeFromCart,
    isInCart,
    avatarDataUrl,
    userId,
    posts,
    listings,
    getPostById,
    deleteListing,
  } = useAppState();
  const [deleting, setDeleting] = useState(false);
  const [listing, setListing] = useState<Listing | undefined | null>(null);
  const [loading, setLoading] = useState(!!id);
  const [imageIndex, setImageIndex] = useState(0);
  const [contacting, setContacting] = useState(false);
  const [sellerModalOpen, setSellerModalOpen] = useState(false);
  const [sellerProfile, setSellerProfile] = useState<UserProfile | null>(null);
  const [sellerProfileLoading, setSellerProfileLoading] = useState(false);
  const [myProposal, setMyProposal] = useState<SwapProposal | null>(null);
  const [incomingProposals, setIncomingProposals] = useState<SwapProposal[]>([]);
  const [splitGroup, setSplitGroup] = useState<SplitBoxGroupDetail | null>(null);
  const [splitGroupLoading, setSplitGroupLoading] = useState(false);

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

  const listingImages = useMemo(() => {
    if (!listing) return [];
    return resolveListingImages(listing.images, listing.image);
  }, [listing]);
  const listingUsesPlaceholder = listing ? !hasListingImage(listing.images, listing.image) : false;

  useEffect(() => {
    setImageIndex(0);
  }, [id, listing?.id]);

  const isOwnListingPost = listing ? isOwnListing(listing, userId) : false;
  const postKind = listing ? listingTradeKind(listing) : 'sell';
  const isSwapPost = postKind === 'swap';
  const isSplitPost = postKind === 'split';
  const isSellPost = postKind === 'sell';
  const splitGroupId = listing?.splitBoxGroupId ?? null;
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
    if (!isSplitPost || !splitGroupId) {
      setSplitGroup(null);
      return;
    }
    let cancelled = false;
    setSplitGroupLoading(true);
    getSplitBox(splitGroupId)
      .then((group) => {
        if (!cancelled) setSplitGroup(group);
      })
      .catch(() => {
        if (!cancelled) setSplitGroup(null);
      })
      .finally(() => {
        if (!cancelled) setSplitGroupLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isSplitPost, splitGroupId]);

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

  const shippingDisplay = listing
    ? listingShippingOptions(listing).join('、')
    : '';

  const handleBuyNow = () => {
    if (!listing) return;
    navigate(`/checkout?listingId=${encodeURIComponent(listing.id)}`);
  };

  const handleClaimSlot = () => {
    if (!listing || !splitGroupId) return;
    const params = new URLSearchParams();
    if (listing.splitBoxSlotId) params.set('slotId', listing.splitBoxSlotId);
    params.set('listingId', listing.id);
    navigateWithReturn(
      navigate,
      `/split-box/${splitGroupId}/apply?${params.toString()}`,
      location
    );
  };

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

  const contactLabel = contacting
    ? '開啟中…'
    : contactBlockedBySwap
      ? '需通過交換申請後才能聯絡'
      : isSplitPost
        ? '聯絡買家'
        : '聯絡賣家';

  const handleEditListing = () => {
    if (!listing) return;
    navigate(`/listing/${listing.id}/edit`);
  };

  const handleDeleteListing = async () => {
    if (!listing || deleting) return;
    if (!window.confirm('確定要刪除此貼文嗎？刪除後無法復原。')) return;
    setDeleting(true);
    try {
      await deleteListing(listing.id);
      navigate('/profile/listings', { replace: true });
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : '刪除失敗，請稍後再試');
    } finally {
      setDeleting(false);
    }
  };

  const cartButtonClass = inCart
    ? 'bg-white border border-black/[0.12] text-on-surface'
    : 'border-2 border-outline bg-white text-on-surface';

  const contactButtonClass =
    'w-full py-4 rounded-full border-2 border-outline bg-white text-sm font-bold text-on-surface shadow-[4px_4px_0_#111] transition-transform active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:opacity-50';

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
          </div>
        </section>

        <section className="rounded-2xl border-2 border-outline bg-white shadow-none p-5 space-y-3">
          <h2 className="text-sm font-bold text-on-surface uppercase tracking-wider">貼文資訊</h2>
          <p className="text-sm text-on-surface"><span className="text-on-surface-variant">品牌：</span>{listing.brand}</p>
          <p className="text-sm text-on-surface"><span className="text-on-surface-variant">系列：</span>{listing.series}</p>
          <p className="text-sm text-on-surface"><span className="text-on-surface-variant">狀態：</span>{listing.condition}</p>
          <p className="text-sm text-on-surface"><span className="text-on-surface-variant">交易方式：</span>{listing.tradeMode}</p>
          <p className="text-sm text-on-surface"><span className="text-on-surface-variant">出貨方式：</span>{shippingDisplay}</p>
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

        {isSplitPost && splitGroupId ? (
          <section className="w-full min-w-0 rounded-2xl border-2 border-outline bg-white shadow-none overflow-hidden">
            <div className="w-full border-b border-black/[0.06] px-5 py-3">
              <h2 className="text-sm font-bold text-on-surface uppercase tracking-wider">所屬拆盒團</h2>
              <p className="mt-1 text-xs text-on-surface-variant">
                查看招募進度、其他款式認領狀況與團規則
              </p>
            </div>
            {splitGroupLoading && !splitGroup ? (
              <p className="w-full px-5 py-8 text-center text-sm text-on-surface-variant">載入拆盒團資訊…</p>
            ) : (
              <div
                role="button"
                tabIndex={0}
                onClick={() => navigateWithReturn(navigate, `/split-box/${splitGroupId}`, location)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigateWithReturn(navigate, `/split-box/${splitGroupId}`, location);
                  }
                }}
                className="block w-full min-w-0 max-w-full cursor-pointer text-left transition-colors active:bg-black/[0.03]"
              >
                {splitGroup ? (
                  <>
                    <div className="flex w-full min-w-0 items-center gap-4 p-4">
                      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-neutral-100">
                        {splitGroup.coverImage ? (
                          <img
                            src={splitGroup.coverImage}
                            alt=""
                            className="h-full w-full object-contain p-2"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <img src="/split-box.svg" alt="" className="h-full w-full object-contain p-2 opacity-70" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-secondary">
                          {SPLIT_BOX_STATUS_LABEL[splitGroup.status] ?? splitGroup.status}
                        </p>
                        <p className="card-title-2 mt-1 text-base font-extrabold leading-snug text-on-surface">
                          {splitGroup.title}
                        </p>
                        <p className="mt-1 text-xs text-on-surface-variant">
                          {[splitGroup.brand, splitGroup.series].filter(Boolean).join(' · ')}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-on-surface">
                          團主：{splitGroup.organizerName}
                        </p>
                      </div>
                      <span className="material-symbols-outlined shrink-0 text-on-surface-variant">chevron_right</span>
                    </div>
                    <div className="w-full border-t border-black/10 px-5 pb-4 pt-3">
                      <div className="mb-1.5 flex justify-between text-[10px] font-bold">
                        <span className="text-on-surface-variant">認領進度</span>
                        <span>
                          {splitGroup.claimedCount} / {splitGroup.targetCount - splitGroup.reservedCount}
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100">
                        <div
                          className="h-full rounded-full bg-accent-sky transition-all"
                          style={{
                            width: `${Math.round(
                              (splitGroup.claimedCount /
                                Math.max(1, splitGroup.targetCount - splitGroup.reservedCount)) *
                                100
                            )}%`,
                          }}
                        />
                      </div>
                      <div className="mt-3 flex flex-wrap gap-3 text-xs text-on-surface-variant">
                        <span>整盒 {splitGroup.totalPrice}</span>
                        <span>每款 {splitGroup.pricePerSlot}</span>
                        <span>{splitGroup.shipping}</span>
                      </div>
                      <p className="mt-3 text-xs font-bold text-primary">查看拆盒團動態與款式認領 →</p>
                    </div>
                  </>
                ) : (
                  <div className="w-full px-5 py-6 text-center">
                    <p className="text-sm text-on-surface-variant">無法載入拆盒團資訊</p>
                    <p className="mt-2 text-xs font-bold text-primary">仍要前往拆盒團頁面 →</p>
                  </div>
                )}
              </div>
            )}
          </section>
        ) : null}

        <section className="w-full min-w-0 rounded-2xl border-2 border-outline bg-white shadow-none overflow-hidden">
          <div className="w-full px-5 pt-5">
            <h2 className="text-sm font-bold text-on-surface uppercase tracking-wider">
              {isSplitPost ? '團主資訊' : '賣家資訊'}
            </h2>
          </div>
          <div
            role="button"
            tabIndex={0}
            onClick={() => setSellerModalOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setSellerModalOpen(true);
              }
            }}
            className="flex w-full min-w-0 max-w-full cursor-pointer items-center gap-3 px-5 pb-5 pt-3 text-left transition-colors active:bg-black/[0.03]"
            aria-label={`查看 ${listing.sellerName} 的${isSplitPost ? '團主' : '賣家'}資訊`}
          >
            {sellerPreviewAvatar ? (
              <img
                src={sellerPreviewAvatar}
                alt=""
                className="h-12 w-12 shrink-0 rounded-full border border-black/[0.1] object-cover"
              />
            ) : (
              <UserAvatar size="md" className="shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-on-surface">{listing.sellerName}</p>
              <p className="text-xs text-on-surface-variant">
                貼文建立於 {new Date(listing.createdAt).toLocaleDateString()}
              </p>
            </div>
            <span className="material-symbols-outlined shrink-0 text-on-surface-variant">chevron_right</span>
          </div>
        </section>

        <SellerInfoModal
          open={sellerModalOpen}
          onClose={() => setSellerModalOpen(false)}
          profile={sellerProfile}
          loading={sellerProfileLoading && Boolean(listing.sellerId)}
          fallbackName={listing.sellerName}
          listingCreatedAt={listing.createdAt}
          activeListingCount={sellerListingCount}
          onActiveListingsClick={
            listing.sellerId && sellerListingCount > 0
              ? () => {
                  setSellerModalOpen(false);
                  navigate(`/search?seller=${encodeURIComponent(listing.sellerId!)}`);
                }
              : undefined
          }
          onRatingsClick={
            listing.sellerId
              ? () => {
                  setSellerModalOpen(false);
                  navigate(
                    `/seller-reviews/${encodeURIComponent(listing.sellerId!)}?name=${encodeURIComponent(listing.sellerName)}`
                  );
                }
              : undefined
          }
          showContact={!isOwnListingPost && !contactBlockedBySwap && !isSwapPost}
          onContact={handleContactSeller}
          contactDisabled={contacting || contactBlockedBySwap}
          contacting={contacting}
          contactLabel={isSplitPost ? '聯絡買家' : '聯絡賣家'}
        />

        <div className="flex flex-col gap-3">
          {isOwnListingPost ? (
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleEditListing}
                className="w-full rounded-full border-2 border-black bg-white py-4 text-sm font-bold text-on-surface shadow-[4px_4px_0_#111] transition-transform active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
              >
                編輯
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={() => void handleDeleteListing()}
                className="w-full rounded-full border-2 border-black bg-white py-4 text-sm font-bold text-red-600 shadow-[4px_4px_0_#111] transition-transform active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:opacity-50"
              >
                {deleting ? '刪除中…' : '刪除'}
              </button>
            </div>
          ) : null}

          {!isOwnListingPost && isSellPost ? (
            <>
              <button
                type="button"
                onClick={handleBuyNow}
                className="w-full rounded-full premium-gradient py-4 text-sm font-bold text-white"
              >
                下單
              </button>
              <button
                type="button"
                onClick={() => {
                  inCart ? removeFromCart(listing.id) : addToCart(listing.id);
                }}
                className={`w-full py-4 rounded-full text-sm font-bold ${cartButtonClass}`}
              >
                {inCart ? '已加入購物車（點我移除）' : '加入購物車'}
              </button>
              <button
                type="button"
                disabled={contacting}
                onClick={handleContactSeller}
                className={contactButtonClass}
              >
                {contactLabel}
              </button>
            </>
          ) : null}

          {!isOwnListingPost && isSplitPost ? (
            <>
              <button
                type="button"
                onClick={handleClaimSlot}
                disabled={!splitGroupId}
                className="w-full rounded-full premium-gradient py-4 text-sm font-bold text-white disabled:opacity-50"
              >
                認領此款
              </button>
              <button
                type="button"
                onClick={() => {
                  inCart ? removeFromCart(listing.id) : addToCart(listing.id);
                }}
                className={`w-full py-4 rounded-full text-sm font-bold ${cartButtonClass}`}
              >
                {inCart ? '已加入購物車（點我移除）' : '加入購物車'}
              </button>
              <button
                type="button"
                disabled={contacting}
                onClick={handleContactSeller}
                className={contactButtonClass}
              >
                {contactLabel}
              </button>
            </>
          ) : null}

          {!isOwnListingPost && isSwapPost ? (
            <button
              type="button"
              onClick={() => {
                inCart ? removeFromCart(listing.id) : addToCart(listing.id);
              }}
              className={`w-full py-4 rounded-full text-sm font-bold ${cartButtonClass}`}
            >
              {inCart ? '已加入購物車（點我移除）' : '加入購物車'}
            </button>
          ) : null}
        </div>

      </main>
    </div>
  );
}
