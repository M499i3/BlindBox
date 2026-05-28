import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import TopBar from '@/frontend/presentation/components/TopBar';
import { useProductCollection } from '@/frontend/presentation/hooks/useProductCollection';
import { useAppState } from '@/frontend/presentation/providers/AppStateProvider';
import { deriveBrandLabel, useCatalogProducts } from '@/frontend/presentation/hooks/useCatalog';

function deriveSeriesName(title: string) {
  const cleaned = title
    .replace(/^泡泡萌粒\s*/g, '')
    .replace(/(手辦|公仔|手办|盲盒|模型|挂件|掛件|周邊|周边)$/g, '')
    .trim();
  const m = cleaned.match(/([A-Za-z0-9\u4e00-\u9fff ×xX·\-\(\)（）]{2,32}?系列)/);
  return m?.[1]?.trim();
}

export default function SubseriesDetail() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { toggleOwned, isOwned } = useAppState();
  const { requestWishProduct, isWished } = useProductCollection();

  const ip = params.get('ip') ?? '';
  const name = params.get('name') ?? '';

  const { products: catalogProducts } = useCatalogProducts();

  const products = useMemo(() => {
    return catalogProducts.filter((p) => {
      if (ip && deriveBrandLabel(p.title) !== ip) return false;
      const s = deriveSeriesName(p.title);
      return name ? s === name : Boolean(s);
    });
  }, [catalogProducts, ip, name]);

  const hero =
    products[0]?.image ??
    'https://global-static.popmart.com/globalAdmin/1776844373939____pc____.jpg?x-oss-process=image/resize,w_800/quality,q_85/format,webp';

  return (
    <div className="w-full min-w-0 max-w-full overflow-x-hidden animate-in fade-in duration-500 min-h-full pb-32">
      <TopBar title={name || '系列'} showBack rightElement={<></>} />

      <main className="pt-topbar-content px-5 space-y-10 w-full min-w-0 max-w-full mx-auto">
        <section>
          <div className="relative w-full aspect-[21/9] rounded-2xl overflow-hidden mb-6">
            <img className="w-full h-full object-cover" src={hero} referrerPolicy="no-referrer" alt="" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
          </div>

          <div className="space-y-4">
            <h2 className="text-3xl font-bold text-on-surface">{name || '系列'}</h2>
            <p className="text-on-surface-variant leading-relaxed text-sm">
              {ip ? `IP：${ip}。` : ''} 依層級瀏覽：品牌 → IP → 系列 → 盲盒。
            </p>

            <div className="flex gap-10 mt-2">
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-primary">{products.length}</span>
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mt-1">
                  盲盒
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-primary">{new Set(products.map((p) => deriveBrandLabel(p.title))).size}</span>
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mt-1">
                  IP
                </span>
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="flex justify-between items-end mb-6">
            <h3 className="text-xl font-bold text-secondary">盲盒</h3>
          </div>

        <div className="grid grid-cols-2 gap-grid-gutter">
          {products.slice(0, 60).map((p) => (
            <motion.button
              key={p.id}
              type="button"
              whileTap={{ scale: 0.98 }}
                onClick={() => navigate(`/product/${p.id}?src=catalog`)}
              className="glass-card rounded-2xl overflow-hidden text-left"
            >
              <div className="relative aspect-square bg-neutral-100">
                <img className="w-full h-full object-cover" src={p.image} referrerPolicy="no-referrer" alt="" />

                <div className="absolute top-2 right-2 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      requestWishProduct(p.id);
                    }}
                    className="w-9 h-9 rounded-full bg-black/45 backdrop-blur-md flex items-center justify-center border border-white/15 active:scale-90 transition-transform"
                    aria-label="加入想要"
                  >
                    <span
                      className="material-symbols-outlined text-white text-[20px]"
                      style={{ fontVariationSettings: isWished(p.id) ? "'FILL' 1" : "'FILL' 0" }}
                    >
                      favorite
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleOwned(p.id);
                    }}
                    className="w-9 h-9 rounded-full bg-black/45 backdrop-blur-md flex items-center justify-center border border-white/15 active:scale-90 transition-transform"
                    aria-label="加入收藏冊"
                  >
                    <span
                      className="material-symbols-outlined text-white text-[20px]"
                      style={{ fontVariationSettings: isOwned(p.id) ? "'FILL' 1" : "'FILL' 0" }}
                    >
                      check_circle
                    </span>
                  </button>
                </div>
              </div>

              <div className="p-3">
                <p className="text-[10px] font-semibold text-primary mb-0.5">{deriveBrandLabel(p.title)}</p>
                <p className="text-xs font-bold text-on-surface line-clamp-2 leading-snug">{p.title}</p>
              </div>
            </motion.button>
          ))}

          {products.length === 0 && (
            <div className="col-span-2 text-center py-10 text-sm text-on-surface-variant">
              沒有找到符合的盲盒。
            </div>
          )}
        </div>
        </section>
      </main>
    </div>
  );
}

