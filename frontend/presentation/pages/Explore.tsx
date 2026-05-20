import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import TopBar from '@/frontend/presentation/components/TopBar';
import { cn } from '@/frontend/shared/utils/cn';
import { useCatalogBrands, useCatalogProducts, buildBrandRow, deriveBrandLabel } from '@/frontend/presentation/hooks/useCatalog';

export default function Explore() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'gallery' | 'collection'>('gallery');
  const [subTab, setSubTab] = useState<'catalog' | 'single' | 'wishlist'>('catalog');

  useEffect(() => {
    const tab = searchParams.get('tab');
    const sub = searchParams.get('sub');
    if (tab === 'collection') setActiveTab('collection');
    if (tab === 'gallery') setActiveTab('gallery');
    if (sub === 'wishlist') setSubTab('wishlist');
    if (sub === 'catalog') setSubTab('catalog');
    if (sub === 'single') setSubTab('single');
  }, [searchParams]);

  const { products } = useCatalogProducts();
  const apiBrands = useCatalogBrands();

  const brands = useMemo(
    () => apiBrands.length > 0 ? apiBrands : buildBrandRow(products, 4),
    [apiBrands, products]
  );

  const collections = useMemo(
    () =>
      products.slice(0, 8).map((p, idx) => ({
        title: p.title,
        brand: deriveBrandLabel(p.title),
        count: `${Math.max(4, 14 - (idx % 6))} 款`,
        image: p.image,
        isNew: idx < 2,
      })),
    [products]
  );

  const wishlistItems = useMemo(
    () =>
      products.slice(8, 16).map((p, idx) => ({
        title: p.title,
        brand: deriveBrandLabel(p.title),
        price: p.price || '—',
        image: p.image,
        hasListing: idx % 3 !== 2,
      })),
    [products]
  );

  const catalogProgress = useMemo(
    () =>
      products.slice(16, 24).map((p, idx) => {
        const total = 12;
        const done = Math.max(1, (idx * 3 + 5) % (total + 1));
        const percent = Math.round((done / total) * 100);
        return {
          title: p.title,
          progress: `${done} / ${total}`,
          percent,
          image: p.image,
          isCompleted: percent >= 100,
        };
      }),
    [products]
  );

  return (
    <div className="animate-in fade-in duration-500">
      <TopBar title="探索" />
      
      <div className="pt-20 px-container-margin max-w-screen-md mx-auto">
        <header className="mb-8">
          <div className="flex items-baseline justify-between mb-6">
            <h2 className="text-3xl font-bold">探索</h2>
            <span className="text-xs font-medium text-on-surface-variant">共 {products.length} 款（官網同步）</span>
          </div>
          
          <div className="grid grid-cols-2 p-1 bg-white rounded-xl relative border border-black/[0.08] shadow-sm">
            <button 
              onClick={() => setActiveTab('gallery')}
              className={cn(
                "relative z-10 py-2.5 text-sm font-medium rounded-lg transition-all",
                activeTab === 'gallery'
                  ? "text-on-surface bg-[#f0f0f0] shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              )}
            >
              圖鑑
            </button>
            <button 
              onClick={() => setActiveTab('collection')}
              className={cn(
                "relative z-10 py-2.5 text-sm font-medium rounded-lg transition-all",
                activeTab === 'collection'
                  ? "text-on-surface bg-[#f0f0f0] shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              )}
            >
              我的收藏
            </button>
          </div>

          {activeTab === 'collection' && (
            <div className="flex gap-4 mt-6">
               {['catalog', 'single', 'wishlist'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setSubTab(tab as 'catalog' | 'single' | 'wishlist')}
                  className={cn(
                    "px-6 py-1.5 text-xs font-semibold rounded-full border transition-all",
                    subTab === tab
                      ? "text-on-surface bg-white border-black/[0.12] shadow-sm"
                      : "text-on-surface-variant border-transparent hover:text-on-surface"
                  )}
                >
                  {tab === 'catalog' ? '收藏冊' : tab === 'single' ? '單品' : '願望清單'}
                </button>
              ))}
            </div>
          )}
        </header>

        {activeTab === 'gallery' ? (
          <>
            <form
              className="relative mb-10 group"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const q = String(fd.get('q') ?? '').trim();
                navigate(q ? `/search?q=${encodeURIComponent(q)}` : '/search');
              }}
            >
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <span className="material-symbols-outlined text-slate-500 group-focus-within:text-primary transition-colors">search</span>
              </div>
              <input
                name="q"
                className="w-full bg-white border border-black/[0.08] rounded-2xl py-4 pl-12 pr-4 text-sm text-on-surface focus:ring-1 focus:ring-primary/50 placeholder:text-slate-600 transition-all shadow-sm"
                placeholder="搜尋品牌、系列或盲盒"
                type="search"
              />
            </form>

            <section className="mb-10">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">熱門品牌</h3>
                <button
                  type="button"
                  onClick={() => navigate('/search')}
                  className="text-sm font-medium text-primary"
                >
                  查看全部
                </button>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
                {brands.map(brand => (
                  <motion.div 
                    key={brand.name}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate(`/brand/${encodeURIComponent(brand.name.toLowerCase())}`)}
                    className="flex-shrink-0 w-32 h-32 rounded-3xl bg-white flex flex-col items-center justify-center border border-black/[0.08] group hover:border-primary/35 transition-all cursor-pointer shadow-sm"
                  >
                    <img className="w-16 h-16 object-contain mb-2 rounded-full grayscale group-hover:grayscale-0 transition-all" src={brand.image} referrerPolicy="no-referrer" alt={brand.name} />
                    <span className="text-[10px] uppercase font-bold text-on-surface text-center px-1 leading-tight">{brand.name}</span>
                  </motion.div>
                ))}
              </div>
            </section>

            <section>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">所有圖鑑</h3>
                <span className="material-symbols-outlined text-slate-400">tune</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {collections.map((item, idx) => (
                  <motion.div 
                    key={idx} 
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate(`/brand/${encodeURIComponent(item.brand.toLowerCase())}`)}
                    className="glass-card rounded-2xl overflow-hidden group cursor-pointer"
                  >
                    <div className="aspect-square relative">
                      <img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" src={item.image} referrerPolicy="no-referrer" alt={item.title} />
                      <button className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/45 backdrop-blur-md flex items-center justify-center text-white border border-white/15 active:scale-90 transition-transform">
                        <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'wght' 700" }}>check</span>
                      </button>
                      {item.isNew && (
                        <div className="absolute bottom-2 left-2 bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter">New</div>
                      )}
                    </div>
                    <div className="p-4">
                      <p className="text-xs font-semibold text-primary mb-1">{item.brand}</p>
                      <h4 className="text-sm font-bold text-on-surface line-clamp-2 leading-snug">{item.title}</h4>
                      <p className="text-xs text-slate-500 mt-1">{item.count}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>
          </>
        ) : subTab === 'wishlist' ? (
          <section className="grid grid-cols-2 gap-grid-gutter mt-stack-md">
            {wishlistItems.map((item, idx) => (
              <motion.div
                key={idx}
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/search?q=${encodeURIComponent(item.title)}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') navigate(`/search?q=${encodeURIComponent(item.title)}`);
                }}
                className="glass-card rounded-2xl overflow-hidden group cursor-pointer text-left"
              >
                <div className="relative aspect-square">
                  <img className={cn("w-full h-full object-cover", !item.hasListing && "grayscale-[0.5] opacity-80")} src={item.image} referrerPolicy="no-referrer" alt={item.title} />
                  <div className="absolute top-2 right-2">
                    <button
                      type="button"
                      onClick={(e) => e.stopPropagation()}
                      className="w-8 h-8 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-md text-primary shadow-lg"
                    >
                      <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
                    </button>
                  </div>
                  {item.hasListing && (
                    <div className="absolute bottom-2 left-2 px-2 py-1 bg-primary/90 backdrop-blur-sm rounded-md shadow-lg">
                      <span className="text-[10px] font-bold text-white uppercase tracking-tighter">市集有人上架</span>
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="text-xs text-on-surface-variant mb-1">{item.brand}</p>
                  <h3 className="text-sm font-bold text-on-surface truncate">{item.title}</h3>
                  <div className="mt-2 flex justify-between items-center">
                    <span className={cn("font-bold text-sm", item.price === '缺貨中' ? 'text-slate-500' : 'text-primary')}>{item.price}</span>
                    {item.hasListing ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/search?q=${encodeURIComponent(item.title)}`);
                        }}
                        className="premium-gradient px-3 py-1 rounded-full text-[10px] font-bold text-white shadow-lg active:scale-95 transition-transform"
                      >
                        查看市集
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white border border-black/[0.1] px-3 py-1 rounded-full text-[10px] font-bold text-on-surface-variant"
                      >
                        設定提醒
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </section>
        ) : (
          <section className="grid grid-cols-2 gap-grid-gutter mt-stack-md">
             {catalogProgress.map((item, idx) => (
               <motion.div key={idx} whileTap={{ scale: 0.98 }} className="glass-card rounded-2xl overflow-hidden active:scale-95 duration-200">
                <div className="aspect-square relative">
                  <img className="w-full h-full object-cover" src={item.image} referrerPolicy="no-referrer" alt={item.title} />
                  {item.isCompleted && (
                    <div className="absolute top-2 right-2 bg-gradient-to-r from-primary to-tertiary text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-lg">已完成</div>
                  )}
                </div>
                <div className="p-4 space-y-3">
                  <div>
                    <h4 className="text-sm font-bold text-on-surface truncate">{item.title}</h4>
                    <p className="text-xs text-primary">{item.progress}</p>
                  </div>
                  <div className="h-1.5 w-full bg-black/[0.06] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-primary to-tertiary-fixed" 
                      style={{ width: `${item.percent}%` }}
                    />
                  </div>
                </div>
              </motion.div>
             ))}
          </section>
        )}
      </div>
    </div>
  );
}
