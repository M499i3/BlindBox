import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { navigateWithReturn } from '@/frontend/shared/utils/routeNavigation';
import type { ProductCollectionApi } from '@/frontend/presentation/hooks/useProductCollection';
import CollectionActionButton from '@/frontend/presentation/components/CollectionActionButton';
import {
  formatProgress,
  type BrandNode,
  type IpNode,
  type SeriesNode,
} from '@/frontend/shared/utils/catalogHierarchy';
import { buildMarketplaceSearchUrl } from '@/frontend/shared/utils/shopNavigation';
type Path =
  | { level: 'brand' }
  | { level: 'ip'; brand: string }
  | { level: 'series'; brand: string; ip: string }
  | { level: 'product'; brand: string; ip: string; series: string };

type Props = {
  open: boolean;
  onClose: () => void;
  collection: ProductCollectionApi;
};

function ProgressBadge({ collected, total }: { collected: number; total: number }) {
  return (
    <span className="shrink-0 rounded-full border-2 border-outline bg-white px-2 py-0.5 text-[11px] font-bold text-primary">
      {formatProgress({ collected, total })}
    </span>
  );
}

function HierarchyCard({
  title,
  subtitle,
  image,
  progress,
  onClick,
}: {
  title: string;
  subtitle?: string;
  image?: string;
  progress: { collected: number; total: number };
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="glass-card flex w-full items-center gap-3 rounded-2xl p-3 text-left shadow-[4px_4px_0_#111] active:bg-black/[0.02]"
    >
      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-neutral-100">
        {image ? (
          <img
            src={image}
            alt=""
            className="h-full w-full object-contain p-1"
            referrerPolicy="no-referrer"
          />
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-on-surface">{title}</p>
        {subtitle ? (
          <p className="mt-0.5 truncate text-[11px] text-on-surface-variant">{subtitle}</p>
        ) : null}
      </div>
      <ProgressBadge {...progress} />
      <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
    </button>
  );
}

export default function CollectionTreeModal({ open, onClose, collection }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const { collectionHierarchy, toggleOwned, isOwned } = collection;
  const [path, setPath] = useState<Path>({ level: 'brand' });

  const resetAndClose = () => {
    setPath({ level: 'brand' });
    onClose();
  };

  const goToSearch = (title: string) => {
    resetAndClose();
    navigateWithReturn(navigate, buildMarketplaceSearchUrl(title), location);
  };

  const breadcrumb = useMemo(() => {
    if (path.level === 'brand') return '我的收藏';
    if (path.level === 'ip') return path.brand;
    if (path.level === 'series') return `${path.brand} · ${path.ip}`;
    return `${path.brand} · ${path.ip} · ${path.series}`;
  }, [path]);

  const goBack = () => {
    if (path.level === 'brand') {
      resetAndClose();
      return;
    }
    if (path.level === 'ip') setPath({ level: 'brand' });
    else if (path.level === 'series') setPath({ level: 'ip', brand: path.brand });
    else setPath({ level: 'series', brand: path.brand, ip: path.ip });
  };

  if (!open) return null;

  const { brands, ipsByBrand, seriesByBrandIp, productsByBrandIpSeries } = collectionHierarchy;

  let listContent: React.ReactNode;

  if (path.level === 'brand') {
    listContent = brands.length ? (
      brands.map((b: BrandNode) => (
        <HierarchyCard
          key={b.id}
          title={b.name}
          subtitle="品牌"
          image={b.image}
          progress={b.progress}
          onClick={() => setPath({ level: 'ip', brand: b.name })}
        />
      ))
    ) : (
      <p className="py-12 text-center text-sm text-on-surface-variant">還沒有收藏的盲盒。</p>
    );
  } else if (path.level === 'ip') {
    const ips = ipsByBrand[path.brand] ?? [];
    listContent = ips.length ? (
      ips.map((node: IpNode) => (
        <HierarchyCard
          key={node.id}
          title={node.name}
          subtitle={path.brand}
          image={node.image}
          progress={node.progress}
          onClick={() => setPath({ level: 'series', brand: path.brand, ip: node.name })}
        />
      ))
    ) : (
      <p className="py-12 text-center text-sm text-on-surface-variant">此品牌下尚無 IP 資料。</p>
    );
  } else if (path.level === 'series') {
    const key = `${path.brand}::${path.ip}`;
    const seriesList = seriesByBrandIp[key] ?? [];
    listContent = seriesList.length ? (
      seriesList.map((node: SeriesNode) => (
        <HierarchyCard
          key={node.id}
          title={node.name}
          subtitle={`${path.brand} · ${path.ip}`}
          image={node.image}
          progress={node.progress}
          onClick={() =>
            setPath({
              level: 'product',
              brand: path.brand,
              ip: path.ip,
              series: node.name,
            })
          }
        />
      ))
    ) : (
      <p className="py-12 text-center text-sm text-on-surface-variant">此 IP 下尚無收藏。</p>
    );
  } else {
    const sk = `${path.brand}::${path.ip}::${path.series}`;
    const leaves = productsByBrandIpSeries[sk] ?? [];
    listContent = leaves.length ? (
      <div className="grid grid-cols-2 gap-3">
        {leaves.map((p) => (
          <div
            key={p.id}
            role="button"
            tabIndex={0}
            onClick={() => goToSearch(p.title)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                goToSearch(p.title);
              }
            }}
            className="glass-card cursor-pointer overflow-hidden rounded-2xl text-left shadow-[4px_4px_0_#111] active:opacity-95"
            aria-label={`搜尋 ${p.title}`}
          >
            <div className="relative aspect-square bg-neutral-100">
              <img src={p.image} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
              <div className="absolute top-2 right-2">
                <CollectionActionButton
                  kind="owned"
                  active={isOwned(p.id)}
                  onClick={() => toggleOwned(p.id)}
                />
              </div>
            </div>
            <div className="w-full p-3 text-left">
              <p className="card-title-2 text-xs font-bold leading-snug text-on-surface">{p.title}</p>
              <p className="mt-1 text-[10px] font-semibold text-primary">搜尋此盲盒</p>
            </div>
          </div>
        ))}
      </div>
    ) : (
      <p className="py-12 text-center text-sm text-on-surface-variant">此系列下尚無收藏。</p>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      onMouseDown={resetAndClose}
    >
      <div className="relative w-full max-w-[560px]" onMouseDown={(e) => e.stopPropagation()}>
        <img
          src="/treasure.svg"
          alt=""
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-0 z-20 h-36 w-36 -translate-x-1/2 -translate-y-1/2 object-contain"
          decoding="async"
        />
        <div className="glass-card flex max-h-[min(85vh,640px)] flex-col overflow-hidden rounded-3xl shadow-[4px_4px_0_#111]">
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-black/[0.06] bg-white/60 p-4 pt-16 backdrop-blur">
            <div className="min-w-0 flex-1 pr-2">
              <h3 className="truncate text-xl font-extrabold text-on-surface">收藏冊</h3>
              {path.level === 'brand' ? (
                <p className="mt-1 truncate text-sm font-semibold text-on-surface-variant">{breadcrumb}</p>
              ) : (
                <button
                  type="button"
                  onClick={goBack}
                  className="mt-1 flex max-w-full items-center gap-0.5 truncate text-left text-sm font-semibold text-primary active:opacity-70"
                  aria-label="返回上一層"
                >
                  <span className="material-symbols-outlined shrink-0 text-base">arrow_back</span>
                  <span className="truncate">{breadcrumb}</span>
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={resetAndClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-black/[0.08] bg-white active:bg-black/[0.03]"
              aria-label="關閉"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <div
            className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-y-contain p-4 pb-6 [-webkit-overflow-scrolling:touch]"
            onMouseDown={(e) => e.stopPropagation()}
          >
            {listContent}
          </div>
        </div>
      </div>
    </div>
  );
}
