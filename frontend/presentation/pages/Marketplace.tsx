import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import TopBar from '@/frontend/presentation/components/TopBar';
import CartIcon from '@/frontend/presentation/components/CartIcon';
import ListingCardImage from '@/frontend/presentation/components/ListingCardImage';
import ListingProductCard from '@/frontend/presentation/components/ListingProductCard';
import TradeModeFilter from '@/frontend/presentation/components/TradeModeFilter';
import { cn } from '@/frontend/shared/utils/cn';
import { useProductCollection } from '@/frontend/presentation/hooks/useProductCollection';
import { useAppState } from '@/frontend/presentation/providers/AppStateProvider';
import { useCatalogProducts } from '@/frontend/presentation/hooks/useCatalog';
import { getRankings, getTrendingTags } from '@/frontend/infrastructure/api/marketplaceApi';
import type { MarketplaceRankingItem } from '@/frontend/infrastructure/api/marketplaceApi';
import type { Listing } from '@/frontend/domain/entities/listing';
import { filterListingsByFuzzyQuery } from '@/frontend/shared/utils/searchListings';
import { isSwapListing, isTradeModeParam, listingMatchesTradeMode, parseTradeMode, tradeModeBadge, type TradeMode } from '@/frontend/shared/utils/tradeMode';
import { APP_PAGE_CLASS, BOTTOM_NAV_OFFSET } from '@/frontend/presentation/constants/layout';
import { TOPBAR_RIGHT_ICON_SIZE } from '@/frontend/presentation/constants/topbar';
import { isOwnListing } from '@/frontend/shared/utils/listingOwnership';

const HOME_SCROLL_KEY = 'home:listScroll';

function getAppScrollEl(): HTMLElement | null {
  return document.querySelector<HTMLElement>('.app-scroll');
}

function saveHomeScroll() {
  const el = getAppScrollEl();
  if (el) sessionStorage.setItem(HOME_SCROLL_KEY, String(el.scrollTop));
}

function restoreHomeScroll() {
  const raw = sessionStorage.getItem(HOME_SCROLL_KEY);
  if (raw == null) return;
  const top = Number(raw);
  if (!Number.isFinite(top)) return;
  const el = getAppScrollEl();
  if (!el) return;
  requestAnimationFrame(() => {
    el.scrollTop = top;
    sessionStorage.removeItem(HOME_SCROLL_KEY);
  });
}

export default function Marketplace() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { cartIds, posts, addToCart, isInCart, userId } = useAppState();
  const {
    toggleWishFromListing,
    toggleOwnedFromListing,
    isListingWished,
    isListingOwned,
  } = useProductCollection();
  const { products } = useCatalogProducts();
  const modeParam = searchParams.get('mode');
  const showFilterView = isTradeModeParam(modeParam);
  const mode = parseTradeMode(modeParam);
  const query = searchParams.get('q') ?? '';

  const setMode = useCallback(
    (next: TradeMode) => {
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          const current = p.get('mode');
          if (isTradeModeParam(current) && current === next) {
            p.delete('mode');
            p.delete('q');
            return p;
          }
          p.set('mode', next);
          return p;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const [rankings, setRankings] = useState<MarketplaceRankingItem[]>([]);
  const [trendingTags, setTrendingTags] = useState<string[]>([]);

  useEffect(() => {
    restoreHomeScroll();
  }, []);

  useEffect(() => {
    getRankings().then(setRankings).catch(console.error);
    getTrendingTags().then(setTrendingTags).catch(console.error);
  }, []);

  const listingPool = useMemo(() => {
    const map = new Map<string, Listing>();
    for (const item of posts) map.set(item.id, item);
    let fromListings = Array.from(map.values());
    if (userId) {
      fromListings = fromListings.filter((item) => !isOwnListing(item, userId));
    }
    if (fromListings.length > 0 || !showFilterView) return fromListings;

    return products.map((p, idx) => ({
      id: `pm_${p.id}`,
      title: p.title,
      itemName: p.title,
      price: p.price || 'HK$ 0.00',
      description: '',
      brand: 'Pop Mart',
      series: '',
      condition: idx % 3 === 1 ? '可拆盒' : '全新未拆',
      tradeMode: idx % 3 === 0 ? '我想換' : idx % 3 === 1 ? '我要拆' : '我要賣',
      shipping: '7-11 店到店',
      allowSwap: idx % 3 === 0,
      allowBargain: false,
      quantity: 1,
      image: p.image,
      createdAt: new Date().toISOString(),
      sellerName: 'Blindy',
      isSeeded: true,
    }));
  }, [posts, products, showFilterView, userId]);

  const filteredListings = useMemo(() => {
    if (!showFilterView) return [];
    let pool = listingPool.filter((item) => listingMatchesTradeMode(item, mode));
    if (query.trim()) pool = filterListingsByFuzzyQuery(pool, query);
    return pool;
  }, [listingPool, mode, query, showFilterView]);

  const homeReturnPath = useMemo(() => {
    const q = query.trim();
    return q ? `/?mode=${mode}&q=${encodeURIComponent(q)}` : `/?mode=${mode}`;
  }, [mode, query]);

  const resolveListing = useCallback(
    (id: string) => listingPool.find((l) => l.id === id),
    [listingPool]
  );

  const showCartFor = useCallback(
    (item: Pick<Listing, 'sellerId' | 'tradeMode' | 'allowSwap'>) =>
      !isOwnListing(item, userId) && !isSwapListing(item),
    [userId]
  );

  const renderCartProps = useCallback(
    (item: Listing) => {
      const show = showCartFor(item);
      return {
        showCart: show,
        isInCart: isInCart(item.id),
        cartDisabled: isInCart(item.id) || !item.price,
        onAddToCart: (e: React.MouseEvent) => {
          e.stopPropagation();
          if (isInCart(item.id) || !item.price) return;
          addToCart(item.id);
        },
      };
    },
    [showCartFor, isInCart, addToCart]
  );

  const openListing = useCallback(
    (item: Listing) => {
      saveHomeScroll();
      if (item.isSeeded) {
        navigate(`/search?q=${encodeURIComponent(item.title)}`, { state: { from: homeReturnPath } });
        return;
      }
      navigate(`/listing/${item.id}`, { state: { from: homeReturnPath } });
    },
    [navigate, homeReturnPath]
  );

  const rankingItems = useMemo(() => {
    if (rankings.length > 0) {
      return rankings.slice(0, 6).map((item) => ({
        id: item.id,
        rank: item.rank.replace(/^No\./, '').padStart(2, '0'),
        title: item.title,
        price: item.price,
        image: item.image,
        isHot: item.is_hot,
      }));
    }
    return products.slice(0, 3).map((p, i) => ({
      id: p.id,
      rank: String(i + 1).padStart(2, '0'),
      title: p.title,
      price: p.price,
      image: p.image,
      isHot: i < 2,
    }));
  }, [rankings, products]);

  const newReleases = useMemo(() => {
    const sorted = listingPool
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return sorted.slice(0, 8).map((p) => ({
      id: p.id,
      title: p.title,
      price: p.price,
      images: p.images,
      fallbackImage: p.image,
      sellerId: p.sellerId,
      tradeMode: p.tradeMode,
      allowSwap: p.allowSwap,
      status: p.tradeMode || '最新上架',
    }));
  }, [listingPool]);

  const recommendations = useMemo(
    () =>
      listingPool.slice(0, 12).map((p, i) => ({
        id: p.id,
        title: p.title,
        price: p.price,
        type: p.tradeMode || (i % 2 === 0 ? '可交換' : '可購買'),
        images: p.images,
        fallbackImage: p.image,
        sellerId: p.sellerId,
        tradeMode: p.tradeMode,
        allowSwap: p.allowSwap,
      })),
    [listingPool]
  );

  return (
    <div className={cn(APP_PAGE_CLASS, 'animate-in fade-in duration-500')}>
      <TopBar
        rightElement={
          <button
            type="button"
            onClick={() => navigate('/cart')}
            className="relative shrink-0 border-0 bg-transparent p-0 cursor-pointer transition-transform active:scale-95 hover:opacity-85"
            aria-label="購物車"
          >
            <CartIcon size={TOPBAR_RIGHT_ICON_SIZE} />
            {cartIds.length > 0 && (
              <span className="absolute top-0 right-0 min-w-5 h-5 px-1 rounded-full bg-secondary text-on-secondary border-2 border-outline text-[10px] font-bold flex items-center justify-center translate-x-1/4 -translate-y-1/4">
                {cartIds.length}
              </span>
            )}
          </button>
        }
      />
      
      <div className="pt-topbar-content px-container-margin">
        {/* Search Bar */}
        <section className="pt-0 pb-stack-lg">
          <form
            className="ui-search"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const q = String(fd.get('q') ?? '').trim();
              navigate(q ? `/search?q=${encodeURIComponent(q)}` : '/search');
            }}
          >
            <span className="material-symbols-outlined ui-search-icon">search</span>
            <input
              name="q"
              className="text-sm"
              placeholder="搜尋品牌、系列、子系列或盲盒"
              type="search"
            />
          </form>
        </section>

        {/* Hero Banner */}
        <section className="mb-section-gap">
          <div className="flex h-[200px] flex-col overflow-hidden rounded-2xl border-[2.5px] border-outline bg-white shadow-[6px_6px_0_#111]">
            <div className="relative min-h-0 flex-1 overflow-hidden">
              <img
                className="absolute left-1/2 -top-24 h-full w-full max-w-none -translate-x-1/2 -translate-y-2 origin-top scale-180 object-contain"
                src="/blindy-banner-icon.svg?v=1"
                alt=""
                decoding="async"
              />
            </div>
            <div className="shrink-0 px-stack-lg pb-3 pt-1">
              <h1 className="mb-0.5 text-2xl font-extrabold text-on-background">找到你缺的那一盒</h1>
              <p className="text-xs font-medium text-on-surface-variant">
                交換、拆盒、購買，一次完成你的收藏
              </p>
            </div>
          </div>
        </section>

        {trendingTags.length > 0 && (
          <section className="mb-section-gap">
            <h2 className="text-lg font-semibold text-on-surface mb-3">熱門標籤</h2>
            <div className="flex max-h-[4.25rem] flex-wrap gap-2 overflow-hidden">
              {trendingTags.slice(0, 12).map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => navigate(`/search?q=${encodeURIComponent(tag)}`)}
                  className="px-3 py-1.5 rounded-full border border-black/[0.12] bg-white text-xs font-bold text-on-surface-variant active:scale-95 transition-transform"
                >
                  #{tag}
                </button>
              ))}
            </div>
          </section>
        )}

        <section className="mb-section-gap">
          <h2 className="mb-stack-lg text-2xl font-semibold text-on-surface">交易方式</h2>
          <TradeModeFilter
            mode={mode}
            onModeChange={setMode}
            selectionActive={showFilterView}
          />
        </section>

        {showFilterView ? (
          <section className="mb-section-gap pb-6">
            {filteredListings.length === 0 ? (
              <p className="py-16 text-center text-sm text-on-surface-variant">
                {query.trim() ? '找不到符合的商品' : '此類型暫無商品'}
              </p>
            ) : (
              <div className="grid grid-cols-2 items-stretch gap-grid-gutter">
                {filteredListings.map((item) => (
                  <ListingProductCard
                    key={item.id}
                    title={item.title}
                    price={isSwapListing(item) ? '可交換' : item.price || '—'}
                    image={item.image}
                    badge={tradeModeBadge(mode)}
                    badgeClassName={
                      mode === 'swap'
                        ? 'border-primary/50 text-primary'
                        : 'border-primary-fixed-dim text-primary-fixed-dim'
                    }
                    onClick={() => openListing(item)}
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
                    {...renderCartProps(item)}
                  />
                ))}
              </div>
            )}
          </section>
        ) : (
          <>
        {/* Ranking */}
        <section className="mb-section-gap">
          <div className="flex justify-between items-center mb-stack-lg">
            <h2 className="text-2xl font-semibold text-on-surface">全圖鑑排行榜</h2>
          </div>
          <div className="flex overflow-x-auto gap-grid-gutter no-scrollbar">
            {rankingItems.map(item => (
              <motion.button
                key={item.id}
                type="button"
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(`/search?q=${encodeURIComponent(item.title)}`)}
                className="min-w-[160px] flex flex-col gap-stack-md text-left"
              >
                <div className="relative aspect-square rounded-2xl overflow-hidden">
                  <ListingCardImage src={item.image} alt={item.title} />
                  <div className="absolute top-2 left-2 flex items-center gap-2">
                    <span className="bg-background/85 backdrop-blur-sm text-on-surface text-[10px] font-black px-2 py-0.5 rounded border border-black/[0.08]">
                      #{item.rank}
                    </span>
                    {item.isHot && (
                      <span className="bg-secondary text-on-secondary text-[10px] font-black px-2 py-0.5 rounded">
                        HOT
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm text-on-surface truncate font-semibold">{item.title}</h3>
                </div>
              </motion.button>
            ))}
          </div>
        </section>

        {/* New Releases */}
        {newReleases.length > 0 && (
          <section className="mb-section-gap">
            <h2 className="text-2xl font-semibold text-on-surface mb-stack-lg">新品上架</h2>
            <div className="-mx-1 flex gap-grid-gutter overflow-x-auto overflow-y-visible no-scrollbar py-3 pb-5 pr-8 pl-2">
              {newReleases.map((item) => {
                const listing = resolveListing(item.id);
                const cartSource = listing ?? ({
                  id: item.id,
                  sellerId: item.sellerId,
                  tradeMode: item.tradeMode,
                  allowSwap: item.allowSwap,
                  price: item.price,
                } as Listing);
                return (
                  <ListingProductCard
                    key={item.id}
                    scrollItem
                    title={item.title}
                    price={isSwapListing(cartSource) ? '可交換' : item.price || '—'}
                    images={item.images}
                    fallbackImage={item.fallbackImage}
                    badge={item.status}
                    badgeClassName={
                      item.status === '可交換'
                        ? 'border-primary/50 text-primary'
                        : 'border-primary-fixed-dim text-primary-fixed-dim'
                    }
                    onClick={() => {
                      if (listing) openListing(listing);
                      else navigate(`/listing/${item.id}`);
                    }}
                    isWished={isListingWished(listing ?? item)}
                    isOwned={isListingOwned(listing ?? item)}
                    onToggleWish={(e) => {
                      e.stopPropagation();
                      if (listing) toggleWishFromListing(listing);
                    }}
                    onToggleOwned={(e) => {
                      e.stopPropagation();
                      if (listing) toggleOwnedFromListing(listing);
                    }}
                    {...(listing ? renderCartProps(listing) : { showCart: false })}
                  />
                );
              })}
            </div>
          </section>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <section className="mb-section-gap">
            <h2 className="text-2xl font-semibold text-on-surface mb-stack-lg">為你推薦</h2>
            <div className="grid grid-cols-2 items-stretch gap-grid-gutter">
              {recommendations.map((item) => {
                const listing = resolveListing(item.id);
                return (
                  <ListingProductCard
                    key={item.id}
                    title={item.title}
                    price={isSwapListing(item) ? '可交換' : item.price || '—'}
                    images={item.images}
                    fallbackImage={item.fallbackImage}
                    badge={item.type}
                    badgeClassName={
                      item.type === '可交換'
                        ? 'border-primary/50 text-primary'
                        : 'border-primary-fixed-dim text-primary-fixed-dim'
                    }
                    onClick={() => {
                      if (listing) openListing(listing);
                      else navigate(`/listing/${item.id}`);
                    }}
                    isWished={isListingWished(listing ?? item)}
                    isOwned={isListingOwned(listing ?? item)}
                    onToggleWish={(e) => {
                      e.stopPropagation();
                      if (listing) toggleWishFromListing(listing);
                    }}
                    onToggleOwned={(e) => {
                      e.stopPropagation();
                      if (listing) toggleOwnedFromListing(listing);
                    }}
                    {...(listing ? renderCartProps(listing) : { showCart: false })}
                  />
                );
              })}
            </div>
          </section>
        )}

          </>
        )}

      </div>

      {/* FAB */}
      <button 
        onClick={() => navigate('/add-listing')}
        className="fixed right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full premium-gradient text-white active:scale-90 transition-transform"
        style={{ bottom: `calc(${BOTTOM_NAV_OFFSET} + 2.25rem)` }}
        aria-label="新增商品"
      >
        <span className="material-symbols-outlined text-3xl">add</span>
      </button>
    </div>
  );
}
