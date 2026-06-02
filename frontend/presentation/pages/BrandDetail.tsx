import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { useNavigate, useParams } from 'react-router-dom';
import TopBar from '@/frontend/presentation/components/TopBar';
import { useProductCollection } from '@/frontend/presentation/hooks/useProductCollection';
import {
  isMockDataEnabled,
  popmartShowcase,
  productsByBrandSlug,
} from '@/frontend/lib/popmartShowcase';
import {
  useCatalogBrands,
  useCatalogProducts,
  useCatalogSeries,
} from '@/frontend/presentation/hooks/useCatalog';

function titleCase(slug: string) {
  return decodeURIComponent(slug)
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function BrandDetail() {
  const { id: slug = '' } = useParams();
  const navigate = useNavigate();
  const mock = isMockDataEnabled();
  const {
    toggleWishForProductIds,
    toggleOwnedForProductIds,
    isAllWished,
    isAllOwned,
  } = useProductCollection();
  const dbBrands = useCatalogBrands();
  const brandSlug = decodeURIComponent(slug).toLowerCase().replace(/\s+/g, '-');
  const { products: apiProducts } = useCatalogProducts({ brand: mock ? undefined : brandSlug });
  const { series: dbSeries } = useCatalogSeries(mock ? undefined : brandSlug);

  const displayName = useMemo(() => {
    const fromDb = dbBrands.find((b) => (b.slug ?? '') === brandSlug || b.name.toLowerCase() === brandSlug);
    return fromDb?.name ?? titleCase(slug);
  }, [dbBrands, brandSlug, slug]);

  const isPopmartBrand =
    displayName.toLowerCase().replace(/\s+/g, '') === 'popmart' ||
    displayName.toLowerCase() === 'pop mart';

  const matched = useMemo(() => {
    if (mock) {
      return isPopmartBrand ? popmartShowcase.products : productsByBrandSlug(slug);
    }
    return apiProducts;
  }, [apiProducts, isPopmartBrand, mock, slug]);

  const hero =
    dbBrands.find((b) => (b.slug ?? '') === brandSlug)?.image ||
    matched[0]?.image ||
    'https://global-static.popmart.com/globalAdmin/1776844373939____pc____.jpg?x-oss-process=image/resize,w_800/quality,q_85/format,webp';

  const seriesGrid = useMemo(() => {
    if (!mock && dbSeries.length > 0) {
      return dbSeries.map((s) => ({
        key: s.slug,
        title: s.name,
        image: s.image || hero,
        count: s.count ?? 0,
        href: `/subseries?brand=${encodeURIComponent(brandSlug)}&series=${encodeURIComponent(s.slug)}&name=${encodeURIComponent(s.name)}`,
        productIds: [] as string[],
      }));
    }
    const map = new Map<string, { key: string; title: string; image: string; count: number; href: string; productIds: string[] }>();
    for (const p of matched) {
      const key = p.id;
      if (!map.has(key)) {
        map.set(key, {
          key,
          title: p.title,
          image: p.image,
          count: 1,
          href: `/product/${p.id}?src=catalog`,
          productIds: [p.id],
        });
      }
    }
    return Array.from(map.values()).slice(0, 30);
  }, [mock, dbSeries, matched, brandSlug, hero]);

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
              依層級瀏覽：品牌 → 系列 → 商品。
            </p>

            <div className="flex gap-10 mt-2">
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-primary">{seriesGrid.length}</span>
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mt-1">
                  系列
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
            <h3 className="text-xl font-bold text-secondary">系列</h3>
          </div>
          <div className="grid grid-cols-2 gap-grid-gutter">
            {seriesGrid.map((item) => (
              <motion.button
                key={item.key}
                type="button"
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(item.href)}
                className="glass-card rounded-2xl overflow-hidden text-left"
              >
                <div className="relative aspect-square bg-neutral-100">
                  <img className="w-full h-full object-cover" src={item.image} referrerPolicy="no-referrer" alt="" />
                  {item.productIds.length > 0 && (
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
                  )}
                </div>
                <div className="p-4">
                  <p className="text-sm font-bold text-on-surface line-clamp-2">{item.title}</p>
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
