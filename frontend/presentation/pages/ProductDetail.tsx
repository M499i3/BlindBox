import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { useNavigate, useParams } from 'react-router-dom';
import TopBar from '@/frontend/presentation/components/TopBar';
import UserAvatar from '@/frontend/presentation/components/UserAvatar';
import { useCatalogProduct, useCatalogProducts, deriveBrandLabel } from '@/frontend/presentation/hooks/useCatalog';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { product } = useCatalogProduct(id);
  const { products: allProducts } = useCatalogProducts();

  const swapImages = useMemo(() => {
    const pool = allProducts.filter((p) => p.id !== id).slice(0, 4);
    return pool.length >= 2
      ? [
          { a: pool[0], b: pool[1] },
          { a: pool[2] ?? pool[0], b: pool[3] ?? pool[1] },
        ]
      : [];
  }, [allProducts, id]);

  const listings = useMemo(
    () =>
      allProducts
        .filter((p) => p.id !== id)
        .slice(0, 4)
        .map((p, i) => ({
          cond: i % 2 === 0 ? '全新未拆' : '已開盒未開袋',
          price: p.price,
          desc: p.title,
          rating: `${4 + (i % 2) * 0.1}★`,
          user: `賣家_${i + 1}`,
          img: p.image,
        })),
    [allProducts, id]
  );

  if (!product) {
    return (
      <div className="animate-in fade-in duration-500 bg-background min-h-screen pt-24 px-6 text-center">
        <p className="text-on-surface-variant text-sm mb-6">找不到此商品（可能已下架或 ID 不存在）。</p>
        <button
          type="button"
          onClick={() => navigate('/search')}
          className="premium-gradient text-white px-6 py-3 rounded-full text-sm font-bold"
        >
          去搜尋
        </button>
      </div>
    );
  }

  const brand = deriveBrandLabel(product.title);

  return (
    <div className="animate-in fade-in duration-500 bg-background min-h-screen">
      <TopBar
        showBack
        title={product.title.slice(0, 18) + (product.title.length > 18 ? '…' : '')}
        rightElement={
          <div className="flex gap-4">
            <button type="button" className="text-slate-500" aria-label="願望清單">
              <span className="material-symbols-outlined">favorite</span>
            </button>
            <button type="button" className="text-slate-500" aria-label="擁有">
              <span className="material-symbols-outlined">check_circle</span>
            </button>
          </div>
        }
      />

      <main className="pt-20 px-container-margin space-y-8 max-w-md mx-auto pb-24">
        <section className="glass-card rounded-2xl overflow-hidden">
          <div className="relative aspect-square w-full bg-neutral-100">
            <img
              className="w-full h-full object-cover"
              src={product.image}
              referrerPolicy="no-referrer"
              alt=""
            />
            <div className="absolute top-4 left-4 bg-gradient-to-r from-primary to-tertiary-fixed px-3 py-1 rounded-full">
              <span className="text-[10px] font-bold text-white uppercase tracking-widest">熱門</span>
            </div>
          </div>
          <div className="p-5 space-y-3">
            <nav className="flex flex-wrap items-center text-[10px] font-bold text-on-primary-container gap-x-1 uppercase tracking-wider">
              <button type="button" onClick={() => navigate('/search')} className="hover:text-primary">
                市集
              </button>
              <span className="material-symbols-outlined text-[12px]">chevron_right</span>
              <span>{brand}</span>
              <span className="material-symbols-outlined text-[12px]">chevron_right</span>
              <span className="text-primary">商品</span>
            </nav>
            <div className="flex justify-between items-end gap-2">
              <div className="min-w-0">
                <h1 className="text-xl font-bold text-on-surface leading-snug">{product.title}</h1>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-tertiary">
                    {product.price}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate(`/search?q=${encodeURIComponent(product.title)}`)}
                className="flex-shrink-0 bg-surface-container-high p-3 rounded-full border border-black/[0.08] active:scale-90 transition-transform"
                aria-label="在市集搜尋此款"
              >
                <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                  search
                </span>
              </button>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold flex items-center gap-2 text-on-surface">
              <span className="bg-primary w-1 h-6 rounded-full" />
              換
              <span className="text-[10px] text-on-surface-variant font-bold ml-2 uppercase tracking-widest">
                TRADING
              </span>
            </h2>
            <button
              type="button"
              onClick={() => navigate(`/search?q=${encodeURIComponent(product.title)}`)}
              className="text-xs font-bold text-primary"
            >
              查看全部
            </button>
          </div>
          <div className="flex overflow-x-auto gap-grid-gutter no-scrollbar -mx-container-margin px-container-margin pb-2">
            {swapImages.length === 0 && (
              <p className="text-sm text-on-surface-variant px-1">尚無其他款式示意，請稍後再試或到搜尋找類似商品。</p>
            )}
            {swapImages.map((pair, idx) => (
              <div key={idx} className="flex-shrink-0 w-[280px] glass-card p-4 rounded-xl border-l-4 border-primary">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-center space-y-2 flex-1">
                    <div className="w-16 h-16 rounded-lg bg-neutral-100 overflow-hidden mx-auto">
                      <img src={pair.a.image} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                    <p className="text-[10px] text-on-surface-variant font-bold line-clamp-2 px-1">{pair.a.title}</p>
                  </div>
                  <div className="bg-surface-container p-2 rounded-full">
                    <span className="material-symbols-outlined text-primary">swap_horiz</span>
                  </div>
                  <div className="text-center space-y-2 flex-1">
                    <div className="w-16 h-16 rounded-lg bg-neutral-100 overflow-hidden mx-auto">
                      <img src={pair.b.image} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                    <p className="text-[10px] text-on-surface-variant font-bold line-clamp-2 px-1">{pair.b.title}</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-black/[0.06] flex justify-between items-center">
                  <div className="flex -space-x-2">
                    <UserAvatar size="sm" className="border-2 border-white z-[1]" />
                    <UserAvatar size="sm" className="border-2 border-white" />
                  </div>
                  <button
                    type="button"
                    className="bg-white text-black px-4 py-1.5 rounded-full text-xs font-bold active:scale-95 transition-transform border border-black/[0.1]"
                  >
                    提議交換
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold flex items-center gap-2 text-on-surface">
              <span className="bg-primary w-1 h-6 rounded-full" />
              拆
              <span className="text-[10px] text-on-surface-variant font-bold ml-2 uppercase tracking-widest">
                GROUP BUY
              </span>
            </h2>
            <span className="text-xs font-bold text-primary cursor-pointer">參與抽盒</span>
          </div>
          <motion.div
            whileTap={{ scale: 0.99 }}
            className="glass-card rounded-2xl p-5 flex items-center gap-6 relative overflow-hidden cursor-pointer"
          >
            <div className="absolute right-0 top-0 h-full w-32 bg-gradient-to-l from-primary/10 to-transparent pointer-events-none" />
            <div className="relative">
              <svg className="w-20 h-20 transform -rotate-90">
                <circle className="text-surface-container-high" cx="40" cy="40" fill="transparent" r="32" stroke="currentColor" strokeWidth="6" />
                <circle
                  className="text-primary"
                  cx="40"
                  cy="40"
                  fill="transparent"
                  r="32"
                  stroke="currentColor"
                  strokeWidth="6"
                  strokeDasharray="201.06"
                  strokeDashoffset="67.02"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-bold text-on-surface">8/12</span>
              </div>
            </div>
            <div className="flex-1 space-y-2">
              <h3 className="font-bold text-on-surface">同系列拆盒團（示意）</h3>
              <p className="text-[10px] text-on-primary-container flex items-center gap-1 font-semibold">
                <span className="material-symbols-outlined text-sm text-tertiary">info</span>
                尚有名額可上車，實際以 App 內拆盒流程為準。
              </p>
              <button
                type="button"
                className="w-full premium-gradient text-white text-xs font-bold py-2 rounded-lg shadow-lg active:scale-95 transition-transform mt-2"
              >
                立即上車
              </button>
            </div>
          </motion.div>
        </section>

        <section className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold flex items-center gap-2 text-on-surface">
              <span className="bg-primary w-1 h-6 rounded-full" />
              賣
              <span className="text-[10px] text-on-surface-variant font-bold ml-2 uppercase tracking-widest">
                LISTINGS
              </span>
            </h2>
            <div className="flex items-center gap-1 bg-surface-container px-3 py-1 rounded-full text-[10px] font-bold text-on-surface-variant">
              <span>價格最低</span>
              <span className="material-symbols-outlined text-sm">expand_more</span>
            </div>
          </div>
          <div className="space-y-4">
            {listings.map((item, idx) => (
              <div key={idx} className="glass-card rounded-xl p-3 flex gap-4">
                <div className="w-24 h-24 rounded-lg overflow-hidden bg-neutral-100 flex-shrink-0">
                  <img className="w-full h-full object-cover" src={item.img} referrerPolicy="no-referrer" alt="" />
                </div>
                <div className="flex-1 flex flex-col justify-between py-1 min-w-0">
                  <div>
                    <div className="flex justify-between items-start gap-2">
                      <span className="bg-surface-container-high text-[8px] text-on-surface-variant px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                        {item.cond}
                      </span>
                      <span className="text-sm font-bold text-on-surface whitespace-nowrap">{item.price}</span>
                    </div>
                    <h4 className="text-xs text-on-surface-variant mt-1 line-clamp-2">{item.desc}</h4>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <UserAvatar size="sm" />
                      <span className="text-[10px] text-on-surface-variant font-medium truncate">
                        {item.user} • <span className="text-primary">{item.rating}</span>
                      </span>
                    </div>
                    <button
                      type="button"
                      className="text-[10px] font-bold text-primary border border-primary/30 px-3 py-1 rounded-full hover:bg-primary/10 transition-colors flex-shrink-0"
                    >
                      立即購買
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
