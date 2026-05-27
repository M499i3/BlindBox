import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import TopBar from '@/frontend/presentation/components/TopBar';
import { popmartShowcase } from '@/frontend/lib/popmartShowcase';
import { useAppState } from '@/frontend/presentation/providers/AppStateProvider';
import { cn } from '@/frontend/shared/utils/cn';
import { filterListingsByFuzzyQuery } from '@/frontend/shared/utils/searchListings';

export default function SearchResults() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQ = searchParams.get('q') ?? '';
  const [draft, setDraft] = useState(initialQ);
  const { posts, addToCart, isInCart } = useAppState();

  useEffect(() => {
    setDraft(initialQ);
  }, [initialQ]);

  const listingResults = useMemo(
    () => filterListingsByFuzzyQuery(posts, initialQ),
    [posts, initialQ]
  );

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = draft.trim();
    setSearchParams(q ? { q } : {});
  };

  return (
    <div className="animate-in fade-in duration-500 pb-28">
      <TopBar title="搜尋" showBack />

      <main className="pt-topbar-content px-container-margin space-y-8 w-full min-w-0 max-w-full">
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

        {initialQ ? (
          <section>
            <h2 className="mb-3 text-sm font-bold text-on-surface">
              貼文結果
              <span className="ml-2 text-on-surface-variant font-semibold">({listingResults.length})</span>
            </h2>
            <div className="grid grid-cols-2 gap-grid-gutter">
              {listingResults.map((item) => (
                <motion.div
                  key={item.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    if (item.isSeeded) {
                      const productId = item.id.replace(/^pm_/, '');
                      navigate(`/product/${productId}`);
                      return;
                    }
                    navigate(`/listing/${item.id}`);
                  }}
                  className="glass-card cursor-pointer overflow-hidden rounded-2xl"
                >
                  <div className="relative aspect-square bg-neutral-100">
                    <img
                      src={item.image}
                      alt=""
                      className="h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="p-3">
                    {item.tradeMode ? (
                      <div className="mb-2 flex gap-2">
                        <span className="rounded border border-primary/50 px-2 py-0.5 text-[10px] text-primary">
                          {item.tradeMode}
                        </span>
                      </div>
                    ) : null}
                    <p className="mb-1 line-clamp-2 text-sm font-semibold leading-snug text-on-surface">
                      {item.title}
                    </p>
                    <div className="flex items-center justify-between gap-2">
                      <p className="shrink-0 whitespace-nowrap font-bold text-primary">{item.price || '—'}</p>
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
                          'h-11 min-w-11 shrink-0 rounded-full border-2 border-outline px-3 text-xs font-extrabold shadow-[2px_2px_0_#111] transition-transform active:translate-x-0.5 active:translate-y-0.5 active:shadow-none',
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
            {listingResults.length === 0 && (
              <p className="py-12 text-center text-sm text-on-surface-variant">
                沒有符合的貼文，請試試其他關鍵字。
              </p>
            )}
          </section>
        ) : (
          <section className="space-y-3">
            <h2 className="text-sm font-bold text-on-surface">熱門（官網新品）</h2>
            <div className="grid grid-cols-2 gap-3">
              {popmartShowcase.products.slice(0, 8).map((p) => (
                <motion.div
                  key={p.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate(`/product/${p.id}`)}
                  className="glass-card cursor-pointer overflow-hidden rounded-2xl text-left"
                >
                  <div className="aspect-square bg-neutral-100">
                    <img
                      src={p.image}
                      alt=""
                      className="h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="p-3">
                    <p className="line-clamp-2 text-sm font-semibold leading-snug text-on-surface">{p.title}</p>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <p className="shrink-0 whitespace-nowrap font-bold text-primary">{p.price || '—'}</p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const cartId = `pm_${p.id}`;
                          if (isInCart(cartId)) return;
                          if (!p.price) return;
                          addToCart(cartId);
                        }}
                        disabled={isInCart(`pm_${p.id}`) || !p.price}
                        className={cn(
                          'h-11 min-w-0 shrink-0 rounded-full border-2 border-outline px-2.5 text-[11px] font-extrabold whitespace-nowrap shadow-[2px_2px_0_#111] transition-transform active:translate-x-0.5 active:translate-y-0.5 active:shadow-none',
                          isInCart(`pm_${p.id}`)
                            ? 'bg-secondary text-on-secondary opacity-90'
                            : !p.price
                              ? 'bg-black/[0.06] text-on-surface-variant opacity-80'
                              : 'bg-white text-on-background hover:bg-secondary/10'
                        )}
                        aria-label={isInCart(`pm_${p.id}`) ? '已加入購物車' : '加入購物車'}
                      >
                        {isInCart(`pm_${p.id}`) ? '已加入' : '加入購物車'}
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
