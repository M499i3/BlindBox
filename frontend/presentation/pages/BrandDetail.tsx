import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { useNavigate, useParams } from 'react-router-dom';
import TopBar from '@/frontend/presentation/components/TopBar';
import { useProductCollection } from '@/frontend/presentation/hooks/useProductCollection';
import {
  deriveBrandLabel,
  isMockDataEnabled,
  popmartShowcase,
  productsByBrandSlug,
} from '@/frontend/lib/popmartShowcase';
import { useCatalogProducts } from '@/frontend/presentation/hooks/useCatalog';

function titleCase(slug: string) {
  return decodeURIComponent(slug)
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function BrandDetail() {
  const { id: slug = '' } = useParams();
  const navigate = useNavigate();
  const {
    toggleWishForProductIds,
    toggleOwnedForProductIds,
    isAllWished,
    isAllOwned,
  } = useProductCollection();
  const { products: apiProducts } = useCatalogProducts();

  const displayName = titleCase(slug);
  const isPopmartBrand =
    displayName.toLowerCase().replace(/\s+/g, '') === 'popmart' ||
    displayName.toLowerCase() === 'pop mart';

  const matched = useMemo(() => {
    if (isMockDataEnabled()) {
      return isPopmartBrand ? popmartShowcase.products : productsByBrandSlug(slug);
    }
    const rawSlug = decodeURIComponent(slug).toLowerCase();
    if (isPopmartBrand) return apiProducts;
    return apiProducts.filter(
      (p) =>
        deriveBrandLabel(p.title).toLowerCase() === rawSlug ||
        p.title.toLowerCase().includes(rawSlug)
    );
  }, [apiProducts, isPopmartBrand, slug]);

  const hero =
    matched[0]?.image ??
    'https://global-static.popmart.com/globalAdmin/1776844373939____pc____.jpg?x-oss-process=image/resize,w_800/quality,q_85/format,webp';

  const ipSeries = useMemo(() => {
    const map = new Map<string, { ip: string; image: string; count: number; productIds: string[] }>();
    for (const p of matched) {
      const ip = deriveBrandLabel(p.title);
      if (!ip || ip === 'Pop Mart') continue;
      if (!map.has(ip)) map.set(ip, { ip, image: p.image, count: 0, productIds: [] });
      const row = map.get(ip)!;
      row.count += 1;
      row.productIds.push(p.id);
    }
    return Array.from(map.values()).slice(0, 30);
  }, [matched]);

  return (
    <div className="w-full min-w-0 max-w-full overflow-x-hidden animate-in fade-in duration-500 min-h-full pb-32">
      <TopBar showBack title={displayName} rightElement={<></>} />

      <main className="pt-topbar-content px-5 space-y-10 w-full min-w-0 max-w-full mx-auto">
        <section>
          <div className="relative w-full aspect-[21/9] rounded-2xl overflow-hidden mb-6">
            <img className="w-full h-full object-cover" src={hero} referrerPolicy="no-referrer" alt="" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
          </div>

          <div className="space-y-4">
            <h2 className="text-3xl font-bold text-on-surface">{displayName}</h2>
            <p className="text-on-surface-variant leading-relaxed text-sm">
              依層級瀏覽：品牌 → IP → 系列 → 商品。
            </p>

            <div className="flex gap-10 mt-2">
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-primary">{ipSeries.length}</span>
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mt-1">
                  IP
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-primary">{matched.length}</span>
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mt-1">
                  相關商品
                </span>
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="flex justify-between items-end mb-6">
            <h3 className="text-xl font-bold text-secondary">IP</h3>
          </div>
          <div className="grid grid-cols-2 gap-grid-gutter">
            {ipSeries.map((item) => (
              <motion.button
                key={item.ip}
                type="button"
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(`/series/${encodeURIComponent(item.ip)}`)}
                className="glass-card rounded-2xl overflow-hidden text-left"
              >
                <div className="relative aspect-square bg-neutral-100">
                  <img className="w-full h-full object-cover" src={item.image} referrerPolicy="no-referrer" alt="" />
                  <div className="absolute top-2 right-2 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleWishForProductIds(item.productIds);
                      }}
                      className="w-9 h-9 rounded-full bg-black/45 backdrop-blur-md flex items-center justify-center border border-white/15 active:scale-90 transition-transform"
                      aria-label={isAllWished(item.productIds) ? '從想要移除' : '加入想要'}
                    >
                      <span
                        className="material-symbols-outlined text-white text-[20px]"
                        style={{ fontVariationSettings: isAllWished(item.productIds) ? "'FILL' 1" : "'FILL' 0" }}
                      >
                        favorite
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleOwnedForProductIds(item.productIds);
                      }}
                      className="w-9 h-9 rounded-full bg-black/45 backdrop-blur-md flex items-center justify-center border border-white/15 active:scale-90 transition-transform"
                      aria-label={isAllOwned(item.productIds) ? '從收藏冊移除' : '加入收藏冊'}
                    >
                      <span
                        className="material-symbols-outlined text-white text-[20px]"
                        style={{ fontVariationSettings: isAllOwned(item.productIds) ? "'FILL' 1" : "'FILL' 0" }}
                      >
                        check_circle
                      </span>
                    </button>
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-sm font-bold text-on-surface">{item.ip}</p>
                  <p className="text-[11px] text-on-surface-variant mt-1">{item.count} 款</p>
                </div>
              </motion.button>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
