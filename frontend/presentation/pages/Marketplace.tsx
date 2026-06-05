import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import TopBar from '@/frontend/presentation/components/TopBar';
import CartIcon from '@/frontend/presentation/components/CartIcon';
import ListingCardImage from '@/frontend/presentation/components/ListingCardImage';
import ListingProductCard from '@/frontend/presentation/components/ListingProductCard';
import TradeModeFilter from '@/frontend/presentation/components/TradeModeFilter';
import { cn } from '@/frontend/shared/utils/cn';
import { useProductCollection } from '@/frontend/presentation/hooks/useProductCollection';
import { useAppState } from '@/frontend/presentation/providers/AppStateProvider';
import { getRankings, getTrendingTags } from '@/frontend/infrastructure/api/marketplaceApi';
import { listSplitBoxes } from '@/frontend/infrastructure/api/splitBoxApi';
import { fetchCached, peekCache, refetchCached, useOnCacheInvalidate } from '@/frontend/shared/utils/fetchCache';
import type { SplitBoxGroupSummary } from '@/frontend/domain/entities/splitBox';
import { SPLIT_BOX_STATUS_LABEL } from '@/frontend/domain/entities/splitBox';
import type { MarketplaceRankingItem } from '@/frontend/infrastructure/api/marketplaceApi';
import type { Listing } from '@/frontend/domain/entities/listing';
import { filterListingsByFuzzyQuery } from '@/frontend/shared/utils/searchListings';
import { isSwapListing, isTradeModeParam, listingMatchesTradeMode, parseTradeMode, tradeModeBadge, type TradeMode } from '@/frontend/shared/utils/tradeMode';
import { APP_PAGE_CLASS, BOTTOM_NAV_OFFSET } from '@/frontend/presentation/constants/layout';
import { TOPBAR_RIGHT_ICON_SIZE } from '@/frontend/presentation/constants/topbar';
import { useListingCardActions } from '@/frontend/presentation/hooks/useListingCardActions';
import { isOwnListing } from '@/frontend/shared/utils/listingOwnership';
import { navigateWithReturn } from '@/frontend/shared/utils/routeNavigation';

function isRealListing(item: Listing): boolean {
  if (item.isSeeded) return false;
  if (item.id.startsWith('pm_')) return false;
  return true;
}

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
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { cartIds, posts, userId } = useAppState();
  const {
    toggleWishFromListing,
    toggleOwnedFromListing,
    isListingWished,
    isListingOwned,
  } = useProductCollection();
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

  const [rankings, setRankings] = useState<MarketplaceRankingItem[]>(
    () => peekCache<MarketplaceRankingItem[]>('marketplace:rankings') ?? []
  );
  const [trendingTags, setTrendingTags] = useState<string[]>(
    () => peekCache<string[]>('marketplace:trending-tags') ?? []
  );
  const [splitBoxes, setSplitBoxes] = useState<SplitBoxGroupSummary[]>(
    () => peekCache<SplitBoxGroupSummary[]>('marketplace:split-boxes') ?? []
  );

  useEffect(() => {
    restoreHomeScroll();
  }, []);

  const loadMarketplaceMeta = useCallback(() => {
    fetchCached('marketplace:rankings', getRankings, 3 * 60 * 1000)
      .then(setRankings)
      .catch(console.error);
    fetchCached('marketplace:trending-tags', getTrendingTags, 3 * 60 * 1000)
      .then(setTrendingTags)
      .catch(console.error);
    if (mode === 'unbox') {
      fetchCached('marketplace:split-boxes', listSplitBoxes, 3 * 60 * 1000)
        .then(setSplitBoxes)
        .catch(() => setSplitBoxes([]));
    }
  }, [mode]);

  useEffect(() => {
    loadMarketplaceMeta();
  }, [loadMarketplaceMeta]);

  useOnCacheInvalidate(() => {
    refetchCached('marketplace:rankings', getRankings)
      .then(setRankings)
      .catch(console.error);
    refetchCached('marketplace:trending-tags', getTrendingTags)
      .then(setTrendingTags)
      .catch(console.error);
    if (mode === 'unbox') {
      refetchCached('marketplace:split-boxes', listSplitBoxes)
        .then(setSplitBoxes)
        .catch(() => setSplitBoxes([]));
    }
  }, 'marketplace:');

  const listingPool = useMemo(() => {
    const map = new Map<string, Listing>();
    for (const item of posts) {
      if (!isRealListing(item)) continue;
      map.set(item.id, item);
    }
    let fromListings = Array.from(map.values());
    if (userId) {
      fromListings = fromListings.filter((item) => !isOwnListing(item, userId));
    }
    return fromListings;
  }, [posts, userId]);

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

  const { getActionProps } = useListingCardActions();

  const openListing = useCallback(
    (item: Pick<Listing, 'id'>) => {
      saveHomeScroll();
      navigate(`/listing/${item.id}`, { state: { from: homeReturnPath } });
    },
    [navigate, homeReturnPath]
  );

  const rankingItems = useMemo(() => {
    if (rankings.length === 0) return [];
    return rankings.slice(0, 6).map((item) => ({
      id: item.id,
      rank: item.rank.replace(/^No\./, '').padStart(2, '0'),
      title: item.title,
      price: item.price,
      image: item.image,
      isHot: item.is_hot,
    }));
  }, [rankings]);

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

  const recommendations = useMemo(() => {
    const wished: typeof listingPool = [];
    const rest: typeof listingPool = [];
    for (const p of listingPool) {
      (isListingWished(p) ? wished : rest).push(p);
    }
    return [...wished, ...rest].map((p) => ({
      id: p.id,
      title: p.title,
      price: p.price,
      type: p.tradeMode,
      images: p.images,
      fallbackImage: p.image,
      sellerId: p.sellerId,
      tradeMode: p.tradeMode,
      allowSwap: p.allowSwap,
    }));
  }, [listingPool, isListingWished]);

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
          <button
            type="button"
            onClick={() => navigate('/search')}
            className="flex h-[200px] w-full flex-col overflow-hidden rounded-2xl border-[2.5px] border-outline bg-white text-left shadow-[6px_6px_0_#111] transition-transform active:scale-[0.99] active:shadow-[4px_4px_0_#111]"
            aria-label="前往搜尋"
          >
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
          </button>
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
          <section className="mb-section-gap pb-6 space-y-6">
            {mode === 'unbox' ? (
              <div>
                <h3 className="mb-3 text-sm font-extrabold text-on-surface">拆盒團</h3>
                {splitBoxes.length === 0 ? (
                  <p className="py-16 text-center text-sm text-on-surface-variant">
                    {query.trim() ? '找不到符合的拆盒團' : '暫無拆盒團，點右下角 ＋ 發起拆盒團'}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {splitBoxes.map((g) => {
                      const claimable = g.targetCount - g.reservedCount;
                      return (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => {
                            saveHomeScroll();
                            navigateWithReturn(navigate, `/split-box/${g.id}`, location, {
                              from: homeReturnPath,
                            });
                          }}
                          className="flex w-full items-center gap-3 rounded-2xl border-2 border-outline bg-white p-3 text-left shadow-[4px_4px_0_#111] active:opacity-95"
                        >
                          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-neutral-50">
                            {g.coverImage ? (
                              <img src={g.coverImage} alt="" className="h-full w-full object-contain p-1" referrerPolicy="no-referrer" />
                            ) : (
                              <img src="/split-box.svg" alt="" className="h-full w-full object-contain p-2 opacity-70" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-secondary">拆盒團</p>
                            <p className="truncate text-sm font-extrabold">{g.title}</p>
                            <p className="mt-0.5 text-[11px] text-on-surface-variant">
                              {SPLIT_BOX_STATUS_LABEL[g.status] ?? g.status} · {g.claimedCount}/{claimable} · {g.pricePerSlot}/款
                            </p>
                          </div>
                          <span className="material-symbols-outlined shrink-0 text-on-surface-variant">chevron_right</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : filteredListings.length === 0 ? (
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
                    {...getActionProps(item)}
                  />
                ))}
              </div>
            )}
          </section>
        ) : (
          <>
        {/* Ranking */}
        {rankingItems.length > 0 ? (
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
                onClick={() => {
                  saveHomeScroll();
                  navigateWithReturn(navigate, `/catalog/${item.id}`, location, { from: '/' });
                }}
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
                  <h3 className="card-title-2 text-sm font-semibold leading-snug text-on-surface">{item.title}</h3>
                </div>
              </motion.button>
            ))}
          </div>
        </section>
        ) : null}

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
                    onClick={() => openListing(listing ?? { id: item.id })}
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
                    {...(listing ? getActionProps(listing) : { showCart: false })}
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
                    onClick={() => openListing(listing ?? { id: item.id })}
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
                    {...(listing ? getActionProps(listing) : { showCart: false })}
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
      <div
        className="group/fab fixed right-4 z-40 flex items-center"
        style={{ bottom: `calc(${BOTTOM_NAV_OFFSET} + 2.25rem)` }}
      >
        <span
          className="pointer-events-none absolute right-full mr-2 whitespace-nowrap rounded-lg border border-black/10 bg-black/80 px-2.5 py-1.5 text-xs font-bold text-white opacity-0 shadow-sm transition-opacity duration-150 group-hover/fab:opacity-100"
          aria-hidden
        >
          新增上架商品
        </span>
        <button
          type="button"
          onClick={() => navigate('/add-listing')}
          className="flex h-14 w-14 items-center justify-center rounded-full premium-gradient text-white active:scale-90 transition-transform"
          aria-label="新增上架商品"
          title="新增上架商品"
        >
          <span className="material-symbols-outlined text-3xl">add</span>
        </button>
      </div>
    </div>
  );
}
