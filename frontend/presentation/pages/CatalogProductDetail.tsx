import React, { useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import TopBar from '@/frontend/presentation/components/TopBar';
import CollectionOverlayActions from '@/frontend/presentation/components/CollectionOverlayActions';
import { useCatalogProduct, deriveBrandLabel } from '@/frontend/presentation/hooks/useCatalog';
import { useProductCollection } from '@/frontend/presentation/hooks/useProductCollection';
import { navigateWithReturn } from '@/frontend/shared/utils/routeNavigation';
import { buildMarketplaceSearchUrl } from '@/frontend/shared/utils/shopNavigation';
import { deriveSeriesName } from '@/frontend/shared/utils/deriveSeriesName';
import type { CatalogProduct } from '@/frontend/domain/entities/catalog';

function formatNtd(amount: number): string {
  return `NT$${amount.toLocaleString('zh-TW')}`;
}

function PriceStatsSection({ product }: { product: CatalogProduct }) {
  const { lastTradedPrice, prevTradedPrice, price90dMin, price90dMax, price90dCount } = product;

  if (!lastTradedPrice) return null;

  const changePct =
    prevTradedPrice && prevTradedPrice > 0
      ? Math.round(((lastTradedPrice - prevTradedPrice) / prevTradedPrice) * 100)
      : null;
  const isUp = changePct !== null && changePct >= 0;
  const arrow = changePct === null ? '' : isUp ? '↗' : '↘';
  const changeLabel =
    changePct === null
      ? ''
      : `${arrow}(${isUp ? '+' : ''}${changePct}%)`;

  const hasRange = price90dMin != null && price90dMax != null;

  return (
    <section className="rounded-2xl border-2 border-outline bg-white shadow-[4px_4px_0_#111] p-4 space-y-3">
      <p className="text-[10px] font-black uppercase tracking-wider text-on-surface">成交行情</p>

      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] text-on-surface-variant font-semibold">最近成交</p>
          <p className="text-xl font-extrabold text-on-surface leading-tight">
            {formatNtd(lastTradedPrice)}
            {changeLabel && (
              <span className={`ml-1.5 text-sm font-bold ${isUp ? 'text-rose-500' : 'text-emerald-600'}`}>
                {changeLabel}
              </span>
            )}
          </p>
        </div>
        {hasRange && (
          <div className="text-right">
            <p className="text-[11px] text-on-surface-variant font-semibold">90 天區間</p>
            <p className="text-sm font-bold text-on-surface whitespace-nowrap">
              {formatNtd(price90dMin!)} – {formatNtd(price90dMax!)}
            </p>
          </div>
        )}
      </div>

      {price90dCount != null && price90dCount > 0 && (
        <p className="text-[11px] text-on-surface-variant">
          近 90 天共 {price90dCount} 筆成交紀錄
        </p>
      )}
    </section>
  );
}

function stopAction(e: React.MouseEvent) {
  e.stopPropagation();
  e.preventDefault();
}

export default function CatalogProductDetail() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { product } = useCatalogProduct(id);
  const { requestWishProduct, toggleProductOwned, isWished, isOwned } = useProductCollection();

  const breadcrumb = useMemo(() => {
    if (!product) return ['圖鑑'];
    const parts = ['圖鑑'];
    const brand = product.brandName ?? deriveBrandLabel(product.title);
    if (brand) parts.push(brand);
    const ip = product.ipName;
    if (ip) parts.push(ip);
    const line = product.seriesName ?? deriveSeriesName(product.title);
    if (line) parts.push(line);
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
  const ipName = product.ipName;
  const seriesName = product.seriesName ?? deriveSeriesName(product.title);
  const metaLine = [ipName, seriesName].filter(Boolean).join(' · ');
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
              {(brand || metaLine) && (
                <p className="mt-1 text-xs font-semibold text-on-surface-variant">
                  {[brand, metaLine].filter(Boolean).join(' · ')}
                </p>
              )}
              {product.price ? (
                <p className="mt-2 text-sm font-bold text-primary">參考價 {product.price}</p>
              ) : null}
            </div>

            <PriceStatsSection product={product} />

            <button
              type="button"
              onClick={() =>
                navigateWithReturn(navigate, buildMarketplaceSearchUrl(product.title), location)
              }
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
