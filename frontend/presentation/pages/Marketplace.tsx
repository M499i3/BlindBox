import React from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import TopBar from '@/frontend/presentation/components/TopBar';
import { cn } from '@/frontend/shared/utils/cn';
import { deriveBrandLabel, popmartShowcase } from '@/frontend/lib/popmartShowcase';
import { useAppState } from '@/frontend/presentation/providers/AppStateProvider';

export default function Marketplace() {
  const navigate = useNavigate();
  const { cartIds, listings, posts } = useAppState();

  const { products, banners } = popmartShowcase;
  const heroImage =
    banners[0]?.image ??
    products[0]?.image ??
    'https://global-static.popmart.com/globalAdmin/1776844373939____pc____.jpg?x-oss-process=image/resize,w_1200/quality,q_85/format,webp';

  const brandTags = Array.from(
    new Set(products.slice(0, 20).map((p) => deriveBrandLabel(p.title)))
  ).slice(0, 6);
  const trendingTags =
    brandTags.length > 0 ? brandTags : ['Pop Mart', 'Dimoo', 'Labubu', '隱藏款'];

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
    <div className="animate-in fade-in duration-500">
      <TopBar
        rightElement={
          <button
            type="button"
            onClick={() => navigate('/cart')}
            className="relative text-black"
            aria-label="購物車"
          >
            <span className="material-symbols-outlined">shopping_cart</span>
            {cartIds.length > 0 && (
              <span className="absolute -top-2 -right-2 min-w-5 h-5 px-1 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">
                {cartIds.length}
              </span>
            )}
          </button>
        }
      />
      
      <div className="pt-16 px-container-margin">
        {/* Search Bar */}
        <section className="py-stack-lg">
          <form
            className="relative group"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const q = String(fd.get('q') ?? '').trim();
              navigate(q ? `/search?q=${encodeURIComponent(q)}` : '/search');
            }}
          >
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-primary-container z-10 pointer-events-none">search</span>
            <input 
              name="q"
              className="w-full bg-white border border-black/[0.08] rounded-full py-3 pl-12 pr-4 text-on-surface placeholder:text-on-primary-container focus:ring-1 focus:ring-primary/40 transition-all text-sm shadow-sm" 
              placeholder="搜尋品牌、系列、子系列或盲盒"
              type="search"
            />
          </form>
        </section>

        {/* Hero Banner */}
        <section className="mb-section-gap">
          <div className="relative rounded-3xl overflow-hidden aspect-[4/5] md:aspect-[21/9]">
            <img 
              className="absolute inset-0 w-full h-full object-cover" 
              src={heroImage}
              referrerPolicy="no-referrer"
              alt="Hero"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 p-stack-lg w-full">
              <h1 className="text-4xl font-bold mb-1 text-white drop-shadow-sm">找到你缺的那一盒</h1>
              <p className="text-white/85 mb-6 text-sm font-medium">交換、拆盒、購買，一次完成你的收藏</p>
              <button
                type="button"
                onClick={() => navigate('/search')}
                className="premium-gradient text-white font-medium py-3 px-stack-lg rounded-full active:scale-95 transition-transform"
              >
                探索熱門交易
              </button>
            </div>
          </div>
        </section>

        {/* Trending Tags */}
        <section className="mb-section-gap overflow-x-auto whitespace-nowrap no-scrollbar flex gap-stack-md">
          {trendingTags.map(tag => (
            <button
              key={tag}
              type="button"
              onClick={() => navigate(`/search?q=${encodeURIComponent(tag)}`)}
              className="bg-white border border-black/[0.08] px-stack-lg py-2 rounded-full text-sm font-medium text-on-surface hover:border-black/15 transition-colors cursor-pointer shadow-sm"
            >
              {tag}
            </button>
          ))}
        </section>

        {/* Ranking */}
        <section className="mb-section-gap">
          <div className="flex justify-between items-center mb-stack-lg">
            <h2 className="text-2xl font-semibold text-on-surface">全圖鑑排行榜</h2>
            <button type="button" onClick={() => navigate('/search')} className="text-slate-500" aria-label="更多">
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
          <div className="flex overflow-x-auto gap-grid-gutter no-scrollbar">
            {rankingItems.map(item => (
              <motion.div 
                key={item.id} 
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(`/product/${item.id}`)}
                className="min-w-[280px] glass-card rounded-2xl p-4 relative flex gap-4 items-center cursor-pointer"
              >
                <span className="absolute top-2 left-2 text-primary text-4xl font-bold italic opacity-50">{item.rank}</span>
                <div className="w-24 h-24 rounded-xl overflow-hidden flex-shrink-0">
                  <img className="w-full h-full object-cover" src={item.image} referrerPolicy="no-referrer" alt={item.title} />
                </div>
                <div className="flex flex-col gap-1">
                  {item.isHot && (
                    <span className="bg-primary/20 text-primary text-[10px] px-2 py-0.5 rounded-full w-max font-bold uppercase tracking-tighter">本週熱門</span>
                  )}
                  <h3 className="text-on-surface font-semibold line-clamp-2 leading-snug">{item.title}</h3>
                  <p className="text-primary font-bold">{item.price}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* New Releases */}
        <section className="mb-section-gap">
          <div className="flex justify-between items-center mb-stack-lg">
            <h2 className="text-2xl font-semibold text-on-surface">新品登場</h2>
            <button type="button" onClick={() => navigate('/search')} className="text-slate-500" aria-label="更多">
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
                  <div className="absolute top-2 left-2 bg-white text-black text-[10px] font-black px-2 py-0.5 rounded">NEW</div>
                </div>
                <h3 className="text-sm text-on-surface truncate font-semibold">{item.title}</h3>
              </motion.button>
            ))}
          </div>
        </section>

        {/* Recommendations */}
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
                    <button className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white">
                      <span className="material-symbols-outlined text-[20px]">check_circle</span>
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

      {/* FAB */}
      <button 
        onClick={() => navigate('/add-listing')}
        className="fixed right-6 bottom-32 w-14 h-14 premium-gradient text-white rounded-full shadow-lg shadow-primary/35 flex items-center justify-center active:scale-90 transition-transform z-40"
      >
        <span className="material-symbols-outlined text-3xl">add</span>
      </button>
    </div>
  );
}
