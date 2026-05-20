import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import TopBar from '@/frontend/presentation/components/TopBar';
import { useCatalogProducts, useCatalogBrands, deriveBrandLabel } from '@/frontend/presentation/hooks/useCatalog';

export default function SearchResults() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQ = searchParams.get('q') ?? '';
  const [draft, setDraft] = useState(initialQ);

  const { products: results } = useCatalogProducts(initialQ ? { q: initialQ } : undefined);
  const { products: allProducts } = useCatalogProducts();
  const brands = useCatalogBrands();

  const popularProducts = useMemo(() => allProducts.slice(0, 8), [allProducts]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = draft.trim();
    setSearchParams(q ? { q } : {});
  };

  return (
    <div className="animate-in fade-in duration-500 pb-28">
      <TopBar title="搜尋" showBack />

      <main className="pt-20 px-container-margin space-y-8 max-w-md mx-auto">
        <form onSubmit={submit} className="relative">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-primary-container">
            search
          </span>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="w-full bg-white border border-black/[0.08] rounded-full py-3 pl-12 pr-4 text-on-surface placeholder:text-on-primary-container focus:ring-1 focus:ring-primary/40 transition-all text-sm shadow-sm"
            placeholder="品牌、系列、商品關鍵字…"
            type="search"
          />
        </form>

        <section>
          <h2 className="text-sm font-bold text-on-surface mb-3">繼續瀏覽品牌</h2>
          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            {brands.map((b) => (
              <button
                key={b.name}
                type="button"
                onClick={() =>
                  navigate(
                    `/brand/${encodeURIComponent(b.name.toLowerCase().replace(/\s+/g, '-'))}`
                  )
                }
                className="flex-shrink-0 px-4 py-2 rounded-full bg-white border border-black/[0.08] text-xs font-semibold text-on-surface hover:border-primary/40 shadow-sm"
              >
                {b.name}
              </button>
            ))}
          </div>
        </section>

        {initialQ ? (
          <section>
            <p className="text-xs text-on-surface-variant mb-4">
              「<span className="font-semibold text-on-surface">{initialQ}</span>」
              約 {results.length} 筆結果（官網同步資料）
            </p>
            <div className="grid grid-cols-2 gap-3">
              {results.map((p) => (
                <motion.button
                  key={p.id}
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate(`/product/${p.id}`)}
                  className="glass-card rounded-2xl overflow-hidden text-left"
                >
                  <div className="aspect-square bg-neutral-100">
                    <img
                      src={p.image}
                      alt=""
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="p-3">
                    <p className="text-[10px] font-semibold text-primary mb-0.5">
                      {deriveBrandLabel(p.title)}
                    </p>
                    <p className="text-xs font-bold text-on-surface line-clamp-2 leading-snug">
                      {p.title}
                    </p>
                    <p className="text-xs font-bold text-primary mt-1">{p.price}</p>
                  </div>
                </motion.button>
              ))}
            </div>
            {results.length === 0 && (
              <p className="text-sm text-on-surface-variant text-center py-12">
                沒有符合的商品，試試其他關鍵字或從品牌進入。
              </p>
            )}
          </section>
        ) : (
          <section className="space-y-3">
            <h2 className="text-sm font-bold text-on-surface">熱門（官網新品）</h2>
            <div className="grid grid-cols-2 gap-3">
              {popularProducts.map((p) => (
                <motion.button
                  key={p.id}
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate(`/product/${p.id}`)}
                  className="glass-card rounded-2xl overflow-hidden text-left"
                >
                  <div className="aspect-square bg-neutral-100">
                    <img
                      src={p.image}
                      alt=""
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="p-3">
                    <p className="text-xs font-bold text-on-surface line-clamp-2">{p.title}</p>
                    <p className="text-xs font-bold text-primary mt-1">{p.price}</p>
                  </div>
                </motion.button>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
