import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import TopBar from '@/frontend/presentation/components/TopBar';
import UserAvatar from '@/frontend/presentation/components/UserAvatar';
import { useAppState } from '@/frontend/presentation/providers/AppStateProvider';
import { useCatalogProduct, deriveBrandLabel } from '@/frontend/presentation/hooks/useCatalog';

function deriveSeriesName(title: string) {
  const cleaned = title
    .replace(/^泡泡萌粒\s*/g, '')
    .replace(/(手辦|公仔|手办|盲盒|模型|挂件|掛件|周邊|周边)$/g, '')
    .trim();
  const m = cleaned.match(/([A-Za-z0-9\u4e00-\u9fff ×xX·\-\(\)（）]{2,32}?系列)/);
  return m?.[1]?.trim();
}

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { product } = useCatalogProduct(id);
  const { toggleOwned, isOwned, toggleWish, isWished, posts } = useAppState();
  const fromCatalog = useMemo(() => new URLSearchParams(location.search).get('src') === 'catalog', [location.search]);
  const catalogRightElement = useMemo(() => {
    if (!product) return undefined;
    return (
      <div className="flex gap-4">
        <button
          type="button"
          onClick={() => toggleWish(product.id)}
          className={isWished(product.id) ? 'text-secondary' : 'text-slate-500'}
          aria-label="加入願望清單"
        >
          <span
            className="material-symbols-outlined"
            style={{ fontVariationSettings: isWished(product.id) ? "'FILL' 1" : "'FILL' 0" }}
          >
            favorite
          </span>
        </button>
        <button
          type="button"
          onClick={() => toggleOwned(product.id)}
          className={isOwned(product.id) ? 'text-primary' : 'text-slate-500'}
          aria-label="加入收藏冊"
        >
          <span
            className="material-symbols-outlined"
            style={{ fontVariationSettings: isOwned(product.id) ? "'FILL' 1" : "'FILL' 0" }}
          >
            check_circle
          </span>
        </button>
      </div>
    );
  }, [product, isOwned, isWished, toggleOwned, toggleWish]);

  const relatedPosts = useMemo(() => {
    if (!product) return { trade: [], group: [], sell: [] as typeof posts };
    const q = product.title.toLowerCase();
    const base = posts.filter((p) => {
      const t = (p.title ?? '').toLowerCase();
      const n = (p.itemName ?? '').toLowerCase();
      return t.includes(q) || n.includes(q);
    });
    const trade = base.filter((p) => p.allowSwap || p.tradeMode?.includes('換')).slice(0, 8);
    const sell = base.filter((p) => p.tradeMode?.includes('賣') || !p.allowSwap).slice(0, 8);
    // 原型資料未必有「拆」貼文，先以示意/空狀態呈現
    const group = base.filter((p) => p.tradeMode?.includes('拆')).slice(0, 6);
    return { trade, group, sell };
  }, [posts, product]);

  if (!product) {
    return (
      <div className="animate-in fade-in duration-500 min-h-screen pt-24 px-6 text-center">
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
  const seriesName = deriveSeriesName(product.title);
  const hero =
    product.image ??
    'https://global-static.popmart.com/globalAdmin/1776844373939____pc____.jpg?x-oss-process=image/resize,w_800/quality,q_85/format,webp';

  return (
    <div className="w-full min-w-0 max-w-full overflow-x-hidden animate-in fade-in duration-500 min-h-full">
      <TopBar
        showBack
        title={
          fromCatalog
            ? product.title.slice(0, 18) + (product.title.length > 18 ? '…' : '')
            : '搜尋'
        }
        rightElement={fromCatalog ? catalogRightElement : undefined}
      />

      <main className="pt-topbar px-container-margin space-y-8 w-full min-w-0 max-w-full mx-auto pb-24">
        <section className="space-y-2">
          <nav className="flex flex-wrap items-center text-[10px] font-bold text-on-surface-variant gap-x-1 uppercase tracking-wider">
            <button type="button" onClick={() => navigate(fromCatalog ? '/explore' : '/search')} className="hover:text-on-surface">
              {fromCatalog ? '圖鑑' : '商城'}
            </button>
            <span className="opacity-70">/</span>
            <button
              type="button"
              onClick={() => navigate(`/brand/${encodeURIComponent(brand.toLowerCase().replace(/\s+/g, '-'))}`)}
              className="hover:text-on-surface"
            >
              {brand}
            </button>
            {seriesName && (
              <>
                <span className="opacity-70">/</span>
                <button
                  type="button"
                  onClick={() => navigate(`/subseries?ip=${encodeURIComponent(brand)}&name=${encodeURIComponent(seriesName)}`)}
                  className="hover:text-on-surface"
                >
                  {seriesName}
                </button>
              </>
            )}
            <span className="opacity-70">/</span>
            <span className="text-on-surface">商品</span>
          </nav>
          <h1 className="text-lg font-extrabold text-on-surface leading-snug">{product.title}</h1>
        </section>

        {fromCatalog && (
          <>
            <section className="glass-card rounded-2xl overflow-hidden">
              <div className="aspect-square bg-neutral-100">
                <img className="w-full h-full object-cover" src={hero} referrerPolicy="no-referrer" alt="" />
              </div>
              <div className="p-5 space-y-3">
                <p className="text-[10px] font-black text-secondary tracking-wider uppercase">盲盒介紹</p>
                <p className="text-sm text-on-surface-variant leading-relaxed">
                  這裡是圖鑑模式的介紹頁（示意）。你可以先收藏/加願望清單，再回到商城查看成交/貼文。
                </p>
                <div className="flex gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => navigate(`/search?q=${encodeURIComponent(product.title)}`)}
                    className="w-full premium-gradient text-white py-4 rounded-full text-sm font-extrabold active:scale-[0.99] transition-transform"
                  >
                    到商城搜尋此商品
                  </button>
                </div>
              </div>
            </section>
          </>
        )}

        {!fromCatalog && (
        <section className="elevated-card rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-secondary tracking-wider uppercase">價格趨勢</p>
              <p className="text-xs text-on-surface-variant mt-1">最近 30 天（示意）</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-on-surface-variant font-semibold">目前</p>
              <p className="text-lg font-extrabold text-on-surface">{product.price}</p>
            </div>
          </div>

          <div className="mt-4 bg-background rounded-2xl border border-outline-variant p-4">
            <svg width="100%" height="54" viewBox="0 0 320 54" aria-hidden>
              <path
                d="M6 38 C 32 18, 54 46, 80 30 S 128 28, 154 18 S 202 22, 228 14 S 276 10, 314 8"
                fill="none"
                stroke="#0047ab"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <path
                d="M6 38 C 32 18, 54 46, 80 30 S 128 28, 154 18 S 202 22, 228 14 S 276 10, 314 8 L314 54 L6 54 Z"
                fill="rgba(0,71,171,0.12)"
              />
            </svg>
            <div className="mt-3 flex items-center justify-between text-[11px] text-on-surface-variant font-semibold">
              <span>低</span>
              <span className="text-secondary font-black">波動</span>
              <span>高</span>
            </div>
          </div>
        </section>
        )}

        {!fromCatalog && (
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
          <div className="space-y-3">
            {relatedPosts.trade.map((p) => (
              <motion.button
                key={p.id}
                type="button"
                whileTap={{ scale: 0.99 }}
                onClick={() => navigate(`/listing/${p.id}`)}
                className="glass-card rounded-2xl p-4 flex items-center gap-4 text-left"
              >
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-neutral-100 flex-shrink-0 border border-black/[0.08]">
                  <img className="w-full h-full object-cover" src={p.image} referrerPolicy="no-referrer" alt="" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                      {p.tradeMode || '我想換'}
                    </span>
                    <span className="text-sm font-extrabold text-primary whitespace-nowrap">{p.price}</span>
                  </div>
                  <p className="text-sm font-bold text-on-surface line-clamp-1 mt-1">{p.title}</p>
                  <p className="text-xs text-on-surface-variant line-clamp-1 mt-1">{p.description}</p>
                </div>
              </motion.button>
            ))}
            {relatedPosts.trade.length === 0 && (
              <p className="text-sm text-on-surface-variant text-center py-6">
                目前沒有相關「換」貼文，先到商城搜尋看看。
              </p>
            )}
          </div>
        </section>
        )}

        {!fromCatalog && (
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
          <div className="space-y-3">
            {relatedPosts.group.map((p) => (
              <motion.button
                key={p.id}
                type="button"
                whileTap={{ scale: 0.99 }}
                onClick={() => navigate(`/listing/${p.id}`)}
                className="glass-card rounded-2xl p-4 flex items-center gap-4 text-left"
              >
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-neutral-100 flex-shrink-0 border border-black/[0.08]">
                  <img className="w-full h-full object-cover" src={p.image} referrerPolicy="no-referrer" alt="" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                      {p.tradeMode || '我要拆'}
                    </span>
                    <span className="text-sm font-extrabold text-primary whitespace-nowrap">{p.price}</span>
                  </div>
                  <p className="text-sm font-bold text-on-surface line-clamp-1 mt-1">{p.title}</p>
                  <p className="text-xs text-on-surface-variant line-clamp-1 mt-1">{p.description}</p>
                </div>
              </motion.button>
            ))}
            {relatedPosts.group.length === 0 && (
              <p className="text-sm text-on-surface-variant text-center py-6">
                目前沒有相關「拆」貼文。
              </p>
            )}
          </div>
        </section>
        )}

        {!fromCatalog && (
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
          <div className="space-y-3">
            {relatedPosts.sell.map((p) => (
              <motion.button
                key={p.id}
                type="button"
                whileTap={{ scale: 0.99 }}
                onClick={() => navigate(`/listing/${p.id}`)}
                className="glass-card rounded-2xl p-4 flex items-center gap-4 text-left"
              >
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-neutral-100 flex-shrink-0 border border-black/[0.08]">
                  <img className="w-full h-full object-cover" src={p.image} referrerPolicy="no-referrer" alt="" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                      {p.tradeMode || '我要賣'}
                    </span>
                    <span className="text-sm font-extrabold text-primary whitespace-nowrap">{p.price}</span>
                  </div>
                  <p className="text-sm font-bold text-on-surface line-clamp-1 mt-1">{p.title}</p>
                  <p className="text-xs text-on-surface-variant line-clamp-1 mt-1">{p.description}</p>
                </div>
              </motion.button>
            ))}
            {relatedPosts.sell.length === 0 && (
              <p className="text-sm text-on-surface-variant text-center py-6">
                目前沒有相關「賣」貼文。
              </p>
            )}
          </div>
        </section>
        )}

        {!fromCatalog && (
          <section className="pt-2">
            <button
              type="button"
              onClick={() => navigate(`/search?q=${encodeURIComponent(product.title)}`)}
              className="w-full premium-gradient text-white py-4 rounded-full text-sm font-extrabold active:scale-[0.99] transition-transform"
            >
              回商城查詢此商品
            </button>
          </section>
        )}
      </main>
    </div>
  );
}
