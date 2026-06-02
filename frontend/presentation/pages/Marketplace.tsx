import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import TopBar from '@/frontend/presentation/components/TopBar';
import CartIcon from '@/frontend/presentation/components/CartIcon';
import { cn } from '@/frontend/shared/utils/cn';
import { useProductCollection } from '@/frontend/presentation/hooks/useProductCollection';
import { useAppState } from '@/frontend/presentation/providers/AppStateProvider';
import { useCatalogProducts } from '@/frontend/presentation/hooks/useCatalog';
import { getRankings, getTrendingTags } from '@/frontend/infrastructure/api/marketplaceApi';
import type { MarketplaceRankingItem } from '@/frontend/infrastructure/api/marketplaceApi';
import { APP_PAGE_CLASS, BOTTOM_NAV_OFFSET } from '@/frontend/presentation/constants/layout';
import { TOPBAR_RIGHT_ICON_SIZE } from '@/frontend/presentation/constants/topbar';

export default function Marketplace() {
  const navigate = useNavigate();
  const { cartIds, listings, posts, addToCart, isInCart } = useAppState();
  const {
    toggleWishFromListing,
    toggleOwnedFromListing,
    isListingWished,
    isListingOwned,
  } = useProductCollection();
  const { products } = useCatalogProducts();

  const [rankings, setRankings] = useState<MarketplaceRankingItem[]>([]);
  const [trendingTags, setTrendingTags] = useState<string[]>([]);

  useEffect(() => {
    getRankings().then(setRankings).catch(console.error);
    getTrendingTags().then(setTrendingTags).catch(console.error);
  }, []);

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
    const pool = Array.from(
      new Map([...posts, ...listings].map((item) => [item.id, item])).values()
    );
  
    const sorted = pool
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
    return sorted.slice(0, 8).map((p) => ({
      id: p.id,
      title: p.title,
      price: p.price,
      image: p.image,
      status: p.tradeMode || '最新上架',
    }));
  }, [posts, listings]);

  const recommendations = posts.slice(0, 12).map((p, i) => ({
    id: p.id,
    title: p.title,
    price: p.price,
    type: p.tradeMode || (i % 2 === 0 ? '可交換' : '可購買'),
    image: p.image,
  }));

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
            <div className="flex flex-wrap gap-2">
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
                  <img className="w-full h-full object-cover" src={item.image} referrerPolicy="no-referrer" alt={item.title} />
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
              {newReleases.map(item => (
                <motion.div
                  key={item.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate(`/listing/${item.id}`)}
                  className="glass-card rounded-2xl overflow-hidden shrink-0 basis-[48%] min-w-[48%] max-w-[48%] flex flex-col cursor-pointer"
                >
                  <div className="relative aspect-square">
                    <img className="w-full h-full object-cover" src={item.image} referrerPolicy="no-referrer" alt={item.title} />
                    <div className="absolute top-2 right-2 flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleWishFromListing(item);
                        }}
                        className="w-9 h-9 rounded-full bg-black/45 backdrop-blur-md flex items-center justify-center border border-white/15 active:scale-90 transition-transform"
                        aria-label={isListingWished(item) ? '從想要移除' : '加入想要'}
                      >
                        <span
                          className="material-symbols-outlined text-white text-[20px]"
                          style={{ fontVariationSettings: isListingWished(item) ? "'FILL' 1" : "'FILL' 0" }}
                        >
                          favorite
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleOwnedFromListing(item);
                        }}
                        className="w-9 h-9 rounded-full bg-black/45 backdrop-blur-md flex items-center justify-center border border-white/15 active:scale-90 transition-transform"
                        aria-label={isListingOwned(item) ? '從收藏冊移除' : '加入收藏冊'}
                      >
                        <span
                          className="material-symbols-outlined text-white text-[20px]"
                          style={{ fontVariationSettings: isListingOwned(item) ? "'FILL' 1" : "'FILL' 0" }}
                        >
                          check_circle
                        </span>
                      </button>
                    </div>
                  </div>
                  <div className="p-3">
                    <div className="flex gap-2 mb-2">
                      <span
                        className={cn(
                          'text-[10px] px-2 py-0.5 rounded border',
                          item.status === '可交換'
                            ? 'border-primary/50 text-primary'
                            : 'border-primary-fixed-dim text-primary-fixed-dim'
                        )}
                      >
                        {item.status}
                      </span>
                    </div>
                    <h3 className="text-sm text-on-surface truncate mb-1 font-semibold">{item.title}</h3>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-primary font-bold whitespace-nowrap">{item.price || '—'}</p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isInCart(item.id)) return;
                          if (!item.price) return;
                          addToCart(item.id);
                        }}
                        disabled={isInCart(item.id) || !item.price}
                        className={cn(
                          'shrink-0 h-11 min-w-11 px-3 rounded-full border-2 border-outline shadow-[3px_3px_0_#111] font-extrabold text-xs transition-transform active:translate-x-0.5 active:translate-y-0.5 active:shadow-none',
                          isInCart(item.id)
                            ? 'bg-secondary text-on-secondary opacity-90'
                            : !item.price
                              ? 'bg-black/[0.06] text-on-surface-variant opacity-80'
                              : 'bg-white text-on-background hover:bg-secondary/10'
                        )}
                        aria-label={isInCart(item.id) ? '已加入購物車' : '加入購物車'}
                      >
                        {isInCart(item.id) ? '已加入' : '加入購物車'}
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <section className="mb-section-gap">
            <h2 className="text-2xl font-semibold text-on-surface mb-stack-lg">為你推薦</h2>
            <div className="grid grid-cols-2 gap-grid-gutter">
              {recommendations.map(item => (
                <motion.div 
                  key={item.id} 
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate(`/listing/${item.id}`)}
                  className="glass-card rounded-2xl overflow-hidden flex flex-col cursor-pointer"
                >
                  <div className="relative aspect-square">
                    <img className="w-full h-full object-cover" src={item.image} referrerPolicy="no-referrer" alt={item.title} />
                    <div className="absolute top-2 right-2 flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleWishFromListing(item);
                        }}
                        className="w-9 h-9 rounded-full bg-black/45 backdrop-blur-md flex items-center justify-center border border-white/15 active:scale-90 transition-transform"
                        aria-label={isListingWished(item) ? '從想要移除' : '加入想要'}
                      >
                        <span
                          className="material-symbols-outlined text-white text-[20px]"
                          style={{ fontVariationSettings: isListingWished(item) ? "'FILL' 1" : "'FILL' 0" }}
                        >
                          favorite
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleOwnedFromListing(item);
                        }}
                        className="w-9 h-9 rounded-full bg-black/45 backdrop-blur-md flex items-center justify-center border border-white/15 active:scale-90 transition-transform"
                        aria-label={isListingOwned(item) ? '從收藏冊移除' : '加入收藏冊'}
                      >
                        <span
                          className="material-symbols-outlined text-white text-[20px]"
                          style={{ fontVariationSettings: isListingOwned(item) ? "'FILL' 1" : "'FILL' 0" }}
                        >
                          check_circle
                        </span>
                      </button>
                    </div>
                  </div>
                  <div className="p-3">
                    <div className="flex gap-2 mb-2">
                      <span className={cn(
                        "text-[10px] px-2 py-0.5 rounded border",
                        item.type === '可交換' ? "border-primary/50 text-primary" : "border-primary-fixed-dim text-primary-fixed-dim"
                      )}>
                        {item.type}
                      </span>
                    </div>
                    <h3 className="text-sm text-on-surface truncate mb-1 font-semibold">{item.title}</h3>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-primary font-bold whitespace-nowrap">{item.price}</p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isInCart(item.id)) return;
                          if (!item.price) return;
                          addToCart(item.id);
                        }}
                        disabled={isInCart(item.id) || !item.price}
                        className={cn(
                          'shrink-0 h-11 min-w-11 px-3 rounded-full border-2 border-outline shadow-[3px_3px_0_#111] font-extrabold text-xs transition-transform active:translate-x-0.5 active:translate-y-0.5 active:shadow-none',
                          isInCart(item.id)
                            ? 'bg-secondary text-on-secondary opacity-90'
                            : !item.price
                              ? 'bg-black/[0.06] text-on-surface-variant opacity-80'
                              : 'bg-white text-on-background hover:bg-secondary/10'
                        )}
                        aria-label={isInCart(item.id) ? '已加入購物車' : '加入購物車'}
                      >
                        {isInCart(item.id) ? '已加入' : '加入購物車'}
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        )}

      </div>

      {/* FAB */}
      <button 
        onClick={() => navigate('/add-listing')}
        className="fixed right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full premium-gradient text-white active:scale-90 transition-transform"
        style={{ bottom: `calc(${BOTTOM_NAV_OFFSET} + 0.75rem)` }}
        aria-label="新增商品"
      >
        <span className="material-symbols-outlined text-3xl">add</span>
      </button>
    </div>
  );
}
