import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { useNavigate, useParams } from 'react-router-dom';
import TopBar from '@/frontend/presentation/components/TopBar';
import { deriveSeriesName } from '@/frontend/shared/utils/catalogHierarchy';
import { useProductCollection } from '@/frontend/presentation/hooks/useProductCollection';
import { deriveBrandLabel, useCatalogProducts } from '@/frontend/presentation/hooks/useCatalog';

export default function SeriesDetail() {
  const { id: ipSlug = '' } = useParams();
  const navigate = useNavigate();
  const {
    toggleWishForProductIds,
    toggleOwnedForProductIds,
    isAllWished,
    isAllOwned,
  } = useProductCollection();

  const ip = decodeURIComponent(ipSlug);
  const { products: catalogProducts } = useCatalogProducts();
  const products = catalogProducts.filter((p) => deriveBrandLabel(p.title) === ip);
  const hero =
    products[0]?.image ??
    'https://global-static.popmart.com/globalAdmin/1776844373939____pc____.jpg?x-oss-process=image/resize,w_800/quality,q_85/format,webp';

  const subseries = useMemo(() => {
    const map = new Map<string, { name: string; image: string; count: number; productIds: string[] }>();
    for (const p of products) {
      const s = deriveSeriesName(p.title);
      if (!s) continue;
      if (!map.has(s)) map.set(s, { name: s, image: p.image, count: 0, productIds: [] });
      const row = map.get(s)!;
      row.count += 1;
      row.productIds.push(p.id);
    }
    return Array.from(map.values()).slice(0, 40);
  }, [products]);

  return (
    <div className="w-full min-w-0 max-w-full overflow-x-hidden animate-in fade-in duration-500 min-h-full pb-32">
      <TopBar title={ip || 'IP'} showBack rightElement={<></>} />

      <main className="pt-topbar-content px-5 space-y-10 w-full min-w-0 max-w-full mx-auto">
        <section>
          <div className="relative w-full aspect-[21/9] rounded-2xl overflow-hidden mb-6">
            <img className="w-full h-full object-cover" src={hero} referrerPolicy="no-referrer" alt="" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
          </div>

          <div className="space-y-4">
            <h2 className="text-3xl font-bold text-on-surface">{ip || 'IP'}</h2>
            <p className="text-on-surface-variant leading-relaxed text-sm">
              依層級瀏覽：品牌 → IP → 系列 → 商品。
            </p>

            <div className="flex gap-10 mt-2">
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-primary">{subseries.length}</span>
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mt-1">
                  系列
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-primary">{products.length}</span>
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mt-1">
                  商品
                </span>
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="flex justify-between items-end mb-6">
            <h3 className="text-xl font-bold text-secondary">系列</h3>
          </div>

        <div className="grid grid-cols-2 gap-grid-gutter">
          {subseries.map((s) => (
            <motion.button
              key={s.name}
              type="button"
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate(`/subseries?ip=${encodeURIComponent(ip)}&name=${encodeURIComponent(s.name)}`)}
              className="glass-card rounded-2xl overflow-hidden text-left"
            >
              <div className="relative aspect-square bg-neutral-100">
                <img className="w-full h-full object-cover" src={s.image} referrerPolicy="no-referrer" alt="" />
                <div className="absolute top-2 right-2 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleOwnedForProductIds(s.productIds);
                    }}
                    className="w-9 h-9 rounded-full bg-black/45 backdrop-blur-md flex items-center justify-center border border-white/15 active:scale-90 transition-transform"
                    aria-label="加入收藏冊"
                  >
                    <span
                      className="material-symbols-outlined text-white text-[20px]"
                      style={{ fontVariationSettings: isAllOwned(s.productIds) ? "'FILL' 1" : "'FILL' 0" }}
                    >
                      check_circle
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleWishForProductIds(s.productIds);
                    }}
                    className="w-9 h-9 rounded-full bg-black/45 backdrop-blur-md flex items-center justify-center border border-white/15 active:scale-90 transition-transform"
                    aria-label="加入想要"
                  >
                    <span
                      className="material-symbols-outlined text-white text-[20px]"
                      style={{ fontVariationSettings: isAllWished(s.productIds) ? "'FILL' 1" : "'FILL' 0" }}
                    >
                      favorite
                    </span>
                  </button>
                </div>
              </div>
              <div className="p-4">
                <p className="text-xs font-semibold text-primary mb-1">{ip}</p>
                <p className="text-sm font-bold text-on-surface line-clamp-2 leading-snug">{s.name}</p>
                <p className="text-[11px] text-on-surface-variant mt-1">{s.count} 款</p>
              </div>
            </motion.button>
          ))}

          {subseries.length === 0 && (
            <div className="col-span-2 text-center py-10 text-sm text-on-surface-variant">
              目前資料中找不到可辨識的子系列。
            </div>
          )}
        </div>
        </section>
      </main>
    </div>
  );
}

