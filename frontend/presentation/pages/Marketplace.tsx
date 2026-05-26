import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import TopBar from '@/frontend/presentation/components/TopBar';
import CartIcon from '@/frontend/presentation/components/CartIcon';
import { cn } from '@/frontend/shared/utils/cn';
import { useAppState } from '@/frontend/presentation/providers/AppStateProvider';
import { useCatalogProducts, deriveBrandLabel } from '@/frontend/presentation/hooks/useCatalog';
import { getRankings } from '@/frontend/infrastructure/api/marketplaceApi';
import type { MarketplaceRankingItem } from '@/frontend/infrastructure/api/marketplaceApi';
import { APP_PAGE_CLASS, BOTTOM_NAV_OFFSET } from '@/frontend/presentation/constants/layout';
import { TOPBAR_RIGHT_ICON_SIZE } from '@/frontend/presentation/constants/topbar';

export default function Marketplace() {
  const navigate = useNavigate();
  const { cartIds, listings, posts, toggleOwned, isOwned, toggleWish, isWished } = useAppState();
  const { products } = useCatalogProducts();

  const [rankings, setRankings] = useState<MarketplaceRankingItem[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);

  useEffect(() => {
    getRankings().then(setRankings).catch(console.error);
  }, []);

  const deriveSeriesName = (title: string) => {
    const cleaned = title
      .replace(/^泡泡萌粒\s*/g, '')
      .replace(/(手辦|公仔|手办|盲盒|模型|挂件|掛件|周邊|周边)$/g, '')
      .trim();
    const m = cleaned.match(/([A-Za-z0-9\u4e00-\u9fff ×xX·\-\(\)（）]{2,32}?系列)/);
    return m?.[1]?.trim();
  };

  const brandTags = ['Pop Mart'];
  const ipTags = Array.from(
    new Set(products.slice(0, 60).map((p) => deriveBrandLabel(p.title)))
  )
    .filter((x) => x !== 'Pop Mart')
    .slice(0, 8);
  const seriesTags = Array.from(
    new Set(
      products
        .slice(0, 120)
        .map((p) => deriveSeriesName(p.title))
        .filter(Boolean) as string[]
    )
  ).slice(0, 10);

  const trendingFallback = ['Pop Mart', 'Dimoo', 'Labubu', '隱藏款'];

  const tagChipClass =
    'bg-surface border border-secondary/35 px-3.5 py-1 rounded-full text-[12px] font-semibold text-on-surface hover:border-secondary hover:bg-secondary/10 transition-colors cursor-pointer shadow-[0_8px_20px_rgba(25,27,34,0.06)]';

  const pickFilterTag = (tag: string) => {
    setFilterOpen(false);
    navigate(`/search?q=${encodeURIComponent(tag)}`);
  };

  const rankingItems = products.slice(0, 4).map((p, i) => ({
    id: p.id,
    rank: String(i + 1).padStart(2, '0'),
    title: p.title,
    price: p.price,
    image: p.image,
    isHot: i < 2,
  }));

  const newReleases = products.slice(4, 7).map((p) => ({
    id: p.id,
    title: p.title,
    image: p.image,
  }));

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
      
      <div className="pt-topbar px-container-margin">
        {/* Search Bar + Filter */}
        <section className="py-stack-lg">
          <div className="flex items-center gap-2">
            <form
              className="ui-search min-w-0 flex-1"
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
            <button
              type="button"
              onClick={() => setFilterOpen(true)}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-outline bg-white shadow-[2px_2px_0_#111] transition-transform active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
              aria-label="篩選"
            >
              <span className="material-symbols-outlined text-[22px] text-on-background">tune</span>
            </button>
          </div>
        </section>

        {/* Hero Banner */}
        <section className="mb-section-gap">
          <div className="flex h-[200px] flex-col overflow-hidden rounded-2xl border-[2.5px] border-outline bg-white shadow-[4px_4px_0_#111]">
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

        {/* Ranking */}
        <section className="mb-section-gap">
          <div className="flex justify-between items-center mb-stack-lg">
            <h2 className="text-2xl font-semibold text-on-surface">全圖鑑排行榜</h2>
            <button type="button" onClick={() => navigate('/search')} className="text-on-surface-variant" aria-label="更多">
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
          <div className="flex overflow-x-auto gap-grid-gutter no-scrollbar">
            {rankingItems.map(item => (
              <motion.button
                key={item.id}
                type="button"
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(`/product/${item.id}`)}
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
                  <div className="absolute top-2 right-2 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleWish(item.id);
                      }}
                      className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white active:scale-95 transition-transform"
                      aria-label="加入願望清單"
                    >
                      <span
                        className="material-symbols-outlined text-[20px]"
                        style={{ fontVariationSettings: isWished(item.id) ? "'FILL' 1" : "'FILL' 0" }}
                      >
                        favorite
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleOwned(item.id);
                      }}
                      className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white active:scale-95 transition-transform"
                      aria-label="加入收藏冊"
                    >
                      <span
                        className="material-symbols-outlined text-[20px]"
                        style={{ fontVariationSettings: isOwned(item.id) ? "'FILL' 1" : "'FILL' 0" }}
                      >
                        check_circle
                      </span>
                    </button>
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
        <section className="mb-section-gap">
          <div className="flex justify-between items-center mb-stack-lg">
            <h2 className="text-2xl font-semibold text-on-surface">新品登場</h2>
            <button type="button" onClick={() => navigate('/search')} className="text-on-surface-variant" aria-label="更多">
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
          <div className="flex overflow-x-auto gap-grid-gutter no-scrollbar">
            {newReleases.map(item => (
              <motion.button
                key={item.id}
                type="button"
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(`/product/${item.id}`)}
                className="min-w-[160px] flex flex-col gap-stack-md text-left"
              >
                <div className="relative aspect-square rounded-2xl overflow-hidden">
                  <img className="w-full h-full object-cover" src={item.image} referrerPolicy="no-referrer" alt="" />
                  <div className="absolute top-2 left-2 bg-secondary text-on-secondary text-[10px] font-black px-2 py-0.5 rounded">NEW</div>
                  <div className="absolute top-2 right-2 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleWish(item.id);
                      }}
                      className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white active:scale-95 transition-transform"
                      aria-label="加入願望清單"
                    >
                      <span
                        className="material-symbols-outlined text-[20px]"
                        style={{ fontVariationSettings: isWished(item.id) ? "'FILL' 1" : "'FILL' 0" }}
                      >
                        favorite
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleOwned(item.id);
                      }}
                      className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white active:scale-95 transition-transform"
                      aria-label="加入收藏冊"
                    >
                      <span
                        className="material-symbols-outlined text-[20px]"
                        style={{ fontVariationSettings: isOwned(item.id) ? "'FILL' 1" : "'FILL' 0" }}
                      >
                        check_circle
                      </span>
                    </button>
                  </div>
                </div>
                <h3 className="text-sm text-on-surface truncate font-semibold">{item.title}</h3>
              </motion.button>
            ))}
          </div>
        </section>

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
                      <button className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white">
                        <span className="material-symbols-outlined text-[20px]">favorite</span>
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
                    <p className="text-primary font-bold">{item.price}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {listings.length > 0 && (
          <section className="mb-section-gap">
            <div className="flex justify-between items-center mb-stack-lg">
              <h2 className="text-2xl font-semibold text-on-surface">最新上架貼文</h2>
              <button type="button" onClick={() => navigate('/profile/listings')} className="text-primary text-sm font-bold">
                查看全部
              </button>
            </div>
            <div className="grid grid-cols-2 gap-grid-gutter">
              {listings.slice(0, 8).map((item) => (
                <motion.button
                  key={item.id}
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate(`/listing/${item.id}`)}
                  className="glass-card rounded-2xl overflow-hidden flex flex-col text-left"
                >
                  <div className="relative aspect-square">
                    <img className="w-full h-full object-cover" src={item.image} alt="" />
                    <span className="absolute top-2 right-2 text-[9px] px-2 py-0.5 rounded-full bg-black/55 text-white font-bold">
                      POST
                    </span>
                  </div>
                  <div className="p-3">
                    <h3 className="text-sm text-on-surface line-clamp-2 mb-1 font-semibold leading-snug">{item.title}</h3>
                    <p className="text-primary font-bold">{item.price}</p>
                  </div>
                </motion.button>
              ))}
            </div>
          </section>
        )}
      </div>

      {filterOpen && (
        <div className="fixed inset-0 z-[60]">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            onClick={() => setFilterOpen(false)}
            aria-label="關閉篩選"
          />
          <div className="absolute left-1/2 top-[17%] w-full max-w-[470px] -translate-x-1/2 px-4">
            <div className="relative max-h-[62vh] overflow-y-auto rounded-3xl border-[2.5px] border-outline bg-white px-4 pb-4 pt-3 shadow-[4px_4px_0_#111] no-scrollbar">
              <button
                type="button"
                onClick={() => setFilterOpen(false)}
                className="absolute right-2.5 top-2.5 text-on-surface-variant"
                aria-label="關閉篩選"
              >
                <span className="material-symbols-outlined text-[22px]">close</span>
              </button>

              <div className="space-y-4 pr-8">
                <div>
                  <p className="mb-2 text-[9px] font-black uppercase tracking-wider text-secondary">BRAND</p>
                  <div className="flex flex-wrap gap-2">
                    {(brandTags.length ? brandTags : trendingFallback.slice(0, 1)).map((tag: string) => (
                      <button
                        key={`brand-${tag}`}
                        type="button"
                        onClick={() => pickFilterTag(tag)}
                        className={tagChipClass}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-[9px] font-black uppercase tracking-wider text-secondary">IP</p>
                  <div className="flex flex-wrap gap-2">
                    {(ipTags.length ? ipTags : trendingFallback.slice(1, 3)).map((tag: string) => (
                      <button
                        key={`ip-${tag}`}
                        type="button"
                        onClick={() => pickFilterTag(tag)}
                        className={tagChipClass}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-[9px] font-black uppercase tracking-wider text-secondary">SERIES</p>
                  <div className="flex flex-wrap gap-2">
                    {(seriesTags.length ? seriesTags : trendingFallback.slice(3)).map((tag: string) => (
                      <button
                        key={`series-${tag}`}
                        type="button"
                        onClick={() => pickFilterTag(tag)}
                        className={tagChipClass}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
