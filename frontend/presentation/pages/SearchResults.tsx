import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import TopBar from '@/frontend/presentation/components/TopBar';
import ListingProductCard from '@/frontend/presentation/components/ListingProductCard';
import { useProductCollection } from '@/frontend/presentation/hooks/useProductCollection';
import { useAppState } from '@/frontend/presentation/providers/AppStateProvider';
import { filterListingsByFuzzyQuery } from '@/frontend/shared/utils/searchListings';
import { useListingCardActions } from '@/frontend/presentation/hooks/useListingCardActions';
import { isOwnListing } from '@/frontend/shared/utils/listingOwnership';
import { isSwapListing } from '@/frontend/shared/utils/tradeMode';
import type { Listing } from '@/frontend/domain/entities/listing';

function openListingPath(item: Listing) {
  return `/listing/${item.id}`;
}

export default function SearchResults() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQ = searchParams.get('q') ?? '';
  const sellerId = searchParams.get('seller') ?? '';
  const [draft, setDraft] = useState(initialQ);
  const { posts, userId } = useAppState();
  const { getActionProps } = useListingCardActions();
  const {
    toggleWishFromListing,
    toggleOwnedFromListing,
    isListingWished,
    isListingOwned,
  } = useProductCollection();

  useEffect(() => {
    setDraft(initialQ);
  }, [initialQ]);

  const sellerName = useMemo(() => {
    if (!sellerId) return null;
    const match = posts.find((p) => p.sellerId === sellerId);
    return match?.sellerName ?? null;
  }, [posts, sellerId]);

  const listingResults = useMemo(() => {
    if (sellerId) {
      return posts.filter((item) => item.sellerId === sellerId);
    }
    return filterListingsByFuzzyQuery(posts, initialQ);
  }, [posts, initialQ, sellerId]);

  const recommendations = useMemo(() => {
    let pool = posts;
    if (userId) {
      pool = pool.filter((item) => !isOwnListing(item, userId));
    }
    return pool.slice(0, 12);
  }, [posts, userId]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = draft.trim();
    if (sellerId) {
      setSearchParams(q ? { seller: sellerId, q } : { seller: sellerId });
    } else {
      setSearchParams(q ? { q } : {});
    }
  };

  const renderListingCard = (item: Listing) => (
    <ListingProductCard
      key={item.id}
      title={item.title}
      price={isSwapListing(item) ? '可交換' : item.price || '—'}
      image={item.image}
      images={item.images}
      fallbackImage={item.image}
      badge={item.tradeMode ?? null}
      badgeClassName={
        isSwapListing(item)
          ? 'border-primary/50 text-primary'
          : 'border-primary-fixed-dim text-primary-fixed-dim'
      }
      onClick={() => navigate(openListingPath(item))}
      isWished={isListingWished(item)}
      isOwned={isListingOwned(item)}
      onToggleWish={(e) => {
        e.stopPropagation();
        toggleWishFromListing(item);
      }}
      onToggleOwned={(e) => {
        e.stopPropagation();
        toggleOwnedFromListing(item);
      }}
      {...getActionProps(item)}
    />
  );

  const pageTitle = sellerId ? (sellerName ? `${sellerName} 的上架` : '賣家上架') : '搜尋';

  return (
    <div className="animate-in fade-in duration-500 pb-28">
      <TopBar title={pageTitle} showBack />

      <main className="pt-topbar-content px-container-margin space-y-8 w-full min-w-0 max-w-full">
        {!sellerId ? (
          <form onSubmit={submit} className="ui-search">
            <span className="material-symbols-outlined ui-search-icon">search</span>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="text-sm"
              placeholder="搜尋貼文名稱…"
              type="search"
            />
          </form>
        ) : null}

        {sellerId || initialQ ? (
          <section>
            <h2 className="mb-3 text-sm font-bold text-on-surface">
              {sellerId ? '上架中' : '貼文結果'}
              <span className="ml-2 text-on-surface-variant font-semibold">({listingResults.length})</span>
            </h2>
            <div className="grid grid-cols-2 items-stretch gap-grid-gutter">
              {listingResults.map((item) => renderListingCard(item))}
            </div>
            {listingResults.length === 0 && (
              <p className="py-12 text-center text-sm text-on-surface-variant">
                {sellerId ? '此賣家目前沒有上架中的貼文。' : '沒有符合的貼文，請試試其他關鍵字。'}
              </p>
            )}
          </section>
        ) : (
          <section className="space-y-3">
            <h2 className="text-sm font-bold text-on-surface">為你推薦</h2>
            {recommendations.length > 0 ? (
              <div className="grid grid-cols-2 items-stretch gap-grid-gutter">
                {recommendations.map((item) => renderListingCard(item))}
              </div>
            ) : (
              <p className="py-12 text-center text-sm text-on-surface-variant">
                目前沒有推薦貼文，試試搜尋關鍵字或到商城逛逛。
              </p>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
