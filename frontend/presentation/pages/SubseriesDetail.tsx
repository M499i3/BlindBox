import React, { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import TopBar from '@/frontend/presentation/components/TopBar';
import CatalogHero from '@/frontend/presentation/components/catalog/CatalogHero';
import CatalogFigurineTile from '@/frontend/presentation/components/catalog/CatalogFigurineTile';
import CatalogSectionHeading from '@/frontend/presentation/components/catalog/CatalogSectionHeading';
import { useProductCollection } from '@/frontend/presentation/hooks/useProductCollection';
import { deriveBrandLabel, useCatalogBrands, useCatalogProducts } from '@/frontend/presentation/hooks/useCatalog';
import { isMockDataEnabled } from '@/frontend/lib/popmartShowcase';
import { deriveSeriesName } from '@/frontend/shared/utils/deriveSeriesName';

export default function SubseriesDetail() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const mock = isMockDataEnabled();
  const { requestWishProduct, toggleProductOwned, isWished, isOwned } = useProductCollection();

  const brandSlug = params.get('brand') ?? '';
  const seriesSlug = params.get('series') ?? '';
  const ipName = params.get('ip') ?? '';
  const lineName = params.get('name') ?? '';

  const dbBrands = useCatalogBrands();
  const brandTitle = useMemo(() => {
    const hit = dbBrands.find((b) => (b.slug ?? '') === brandSlug);
    return hit?.name ?? (brandSlug ? brandSlug.replace(/-/g, ' ') : '');
  }, [dbBrands, brandSlug]);

  const { products: catalogProducts } = useCatalogProducts(
    mock
      ? undefined
      : {
          brand: brandSlug || undefined,
          series: seriesSlug || undefined,
        }
  );

  const products = useMemo(() => {
    if (mock) {
      return catalogProducts.filter((p) => {
        if (ipName && deriveBrandLabel(p.title) !== ipName) return false;
        const s = deriveSeriesName(p.title);
        return lineName ? s === lineName : Boolean(s);
      });
    }
    return catalogProducts.filter((p) => {
      if (lineName && p.seriesName && p.seriesName !== lineName) return false;
      if (seriesSlug && p.seriesSlug && p.seriesSlug !== seriesSlug) return false;
      if (ipName && p.ipName && p.ipName !== ipName) return false;
      return true;
    });
  }, [mock, catalogProducts, ipName, lineName, seriesSlug]);

  const hero =
    products[0]?.image ??
    'https://global-static.popmart.com/globalAdmin/1776844373939____pc____.jpg?x-oss-process=image/resize,w_800/quality,q_85/format,webp';

  const ownedCount = useMemo(
    () => products.filter((p) => isOwned(p.id)).length,
    [products, isOwned]
  );

  const breadcrumb = useMemo(() => {
    const parts = ['圖鑑'];
    if (mock && ipName) parts.push(ipName);
    else if (brandTitle) parts.push(brandTitle);
    if (ipName && !mock) parts.push(ipName);
    if (lineName) parts.push(lineName);
    return parts;
  }, [mock, ipName, brandTitle, lineName]);

  return (
    <div className="w-full min-w-0 max-w-full overflow-x-hidden animate-in fade-in duration-500 min-h-full pb-32">
      <TopBar title={lineName || '系列'} showBack rightElement={<></>} />

      <main className="mx-auto w-full min-w-0 max-w-full space-y-8 px-container-margin pt-topbar-content">
        <CatalogHero
          title={lineName || '系列'}
          subtitle="收錄款式圖鑑，點選查看詳情或標記收藏。"
          breadcrumb={breadcrumb}
          coverImage={hero}
          stats={[
            { label: '款式', value: products.length },
            { label: '已收藏', value: ownedCount },
          ]}
        />

        {products.length > 0 && (
          <div className="rounded-2xl border-2 border-outline bg-white p-3 shadow-[3px_3px_0_#111]">
            <div className="mb-1.5 flex items-center justify-between text-[10px] font-bold">
              <span className="text-on-surface-variant">收藏進度</span>
              <span className="text-on-surface">
                {ownedCount} / {products.length}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-neutral-100">
              <div
                className="h-full rounded-full bg-accent-sky transition-all duration-300"
                style={{ width: `${products.length ? (ownedCount / products.length) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}

        <section>
          <CatalogSectionHeading label="Figurines" title="款式圖鑑" count={products.length} />

          <div className="grid grid-cols-3 gap-x-3 gap-y-5">
            {products.slice(0, 60).map((p) => (
              <CatalogFigurineTile
                key={p.id}
                title={p.title}
                image={p.image}
                isWished={isWished(p.id)}
                isOwned={isOwned(p.id)}
                onClick={() => navigate(`/catalog/${p.id}`)}
                onToggleWish={(e) => {
                  e.stopPropagation();
                  requestWishProduct(p.id);
                }}
                onToggleOwned={(e) => {
                  e.stopPropagation();
                  toggleProductOwned(p.id);
                }}
              />
            ))}
          </div>

          {products.length === 0 && (
            <div className="rounded-2xl border-2 border-dashed border-outline/40 bg-neutral-50 py-12 text-center">
              <span className="material-symbols-outlined mb-2 text-3xl text-on-surface-variant">inventory_2</span>
              <p className="text-sm text-on-surface-variant">沒有找到符合的盲盒款式。</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
