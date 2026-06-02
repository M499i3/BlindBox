import React, { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import TopBar from '@/frontend/presentation/components/TopBar';
import CollectionOverlayActions from '@/frontend/presentation/components/CollectionOverlayActions';
import PriceTrendChart from '@/frontend/presentation/components/PriceTrendChart';
import { useCatalogProduct, deriveBrandLabel } from '@/frontend/presentation/hooks/useCatalog';
import { useProductCollection } from '@/frontend/presentation/hooks/useProductCollection';
import { buildMarketplaceSearchUrl } from '@/frontend/shared/utils/shopNavigation';

function deriveSeriesName(title: string) {
  const cleaned = title
    .replace(/^泡泡萌粒\s*/g, '')
    .replace(/(手辦|公仔|手办|盲盒|模型|挂件|掛件|周邊|周边)$/g, '')
    .trim();
  const m = cleaned.match(/([A-Za-z0-9\u4e00-\u9fff ×xX·\-\(\)（）]{2,32}?系列)/);
  return m?.[1]?.trim();
}

function stopAction(e: React.MouseEvent) {
  e.stopPropagation();
  e.preventDefault();
}

export default function CatalogProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { product } = useCatalogProduct(id);
  const { requestWishProduct, toggleProductOwned, isWished, isOwned } = useProductCollection();

  const breadcrumb = useMemo(() => {
    if (!product) return ['圖鑑'];
    const parts = ['圖鑑'];
    const brand = product.brandName ?? deriveBrandLabel(product.title);
    if (brand) parts.push(brand);
    const series = product.seriesName ?? deriveSeriesName(product.title);
    if (series) parts.push(series);
    return parts;
  }, [product]);

  if (!product) {
    return (
      <div className="animate-in fade-in min-h-screen px-6 pt-24 text-center duration-500">
        <p className="mb-6 text-sm text-on-surface-variant">找不到此盲盒（可能已下架或 ID 不存在）。</p>
        <button
          type="button"
          onClick={() => navigate('/explore')}
          className="premium-gradient rounded-full px-6 py-3 text-sm font-bold text-white"
        >
          回圖鑑
        </button>
      </div>
    );
  }

  const brand = product.brandName ?? deriveBrandLabel(product.title);
  const seriesName = product.seriesName ?? deriveSeriesName(product.title);
  const hero = product.image;

  return (
    <div className="w-full min-w-0 max-w-full overflow-x-hidden animate-in fade-in duration-500 min-h-full pb-32">
      <TopBar
        showBack
        title={product.title.length > 16 ? `${product.title.slice(0, 16)}…` : product.title}
        rightElement={<></>}
      />

      <main className="mx-auto w-full min-w-0 max-w-full space-y-6 px-container-margin pt-topbar-content">
        <nav className="flex flex-wrap items-center gap-x-1 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
          {breadcrumb.map((part, i) => (
            <React.Fragment key={`${part}-${i}`}>
              {i > 0 ? <span className="opacity-70">/</span> : null}
              <span className={i === breadcrumb.length - 1 ? 'text-on-surface' : undefined}>{part}</span>
            </React.Fragment>
          ))}
        </nav>

        <section className="overflow-hidden rounded-2xl border-2 border-outline bg-white shadow-[4px_4px_0_#111]">
          <div className="relative aspect-square bg-neutral-50">
            {hero ? (
              <img
                className="h-full w-full object-contain p-6"
                src={hero}
                referrerPolicy="no-referrer"
                alt=""
              />
            ) : null}
            <CollectionOverlayActions
              isWished={isWished(product.id)}
              isOwned={isOwned(product.id)}
              onToggleWish={(e) => {
                stopAction(e);
                requestWishProduct(product.id);
              }}
              onToggleOwned={(e) => {
                stopAction(e);
                toggleProductOwned(product.id);
              }}
            />
          </div>

          <div className="space-y-4 p-5">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-secondary">盲盒詳情</p>
              <h1 className="mt-1 text-lg font-extrabold leading-snug text-on-surface">{product.title}</h1>
              {(brand || seriesName) && (
                <p className="mt-1 text-xs font-semibold text-on-surface-variant">
                  {[brand, seriesName].filter(Boolean).join(' · ')}
                </p>
              )}
              {product.price ? (
                <p className="mt-2 text-sm font-bold text-primary">參考價 {product.price}</p>
              ) : null}
            </div>

            <PriceTrendChart seed={product.id} currentPriceText={product.price} />

            <button
              type="button"
              onClick={() => navigate(buildMarketplaceSearchUrl(product.title))}
              className="premium-gradient w-full rounded-full py-4 text-sm font-extrabold text-white shadow-[3px_3px_0_#111] transition-transform active:scale-[0.99]"
            >
              到商城搜尋此盲盒
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
