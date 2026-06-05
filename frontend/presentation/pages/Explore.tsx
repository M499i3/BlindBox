import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import TopBar from '@/frontend/presentation/components/TopBar';
import CatalogFigurineTile from '@/frontend/presentation/components/catalog/CatalogFigurineTile';
import { cn } from '@/frontend/shared/utils/cn';
import { useProductCollection } from '@/frontend/presentation/hooks/useProductCollection';
import { navigateWithReturn } from '@/frontend/shared/utils/routeNavigation';
import {
  deriveBrandLabel,
  useCatalogBrands,
  useCatalogProducts,
  useCatalogSearch,
  useCatalogIps,
} from '@/frontend/presentation/hooks/useCatalog';
import { isMockDataEnabled } from '@/frontend/lib/popmartShowcase';
import { brandLogoForSlug } from '@/frontend/lib/brandLogos';
import { popmartIpImageForName, popmartIpImageForSlug } from '@/frontend/lib/popmartIpImages';
import { deriveSeriesName, FALLBACK_SERIES } from '@/frontend/shared/utils/deriveSeriesName';

export default function Explore() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const go = (to: string) => navigateWithReturn(navigate, to, location);

  const mock = isMockDataEnabled();
  const { requestWishProduct, toggleProductOwned, isWished, isOwned } = useProductCollection();

  const activeQuery = (searchParams.get('q') ?? '').trim();
  const [draft, setDraft] = useState(activeQuery);
  const [selectedBrandSlug, setSelectedBrandSlug] = useState('');
  const [selectedIp, setSelectedIp] = useState<string>('');
  const isSearching = activeQuery.length > 0;
  const { result: searchResult, loading: searchLoading } = useCatalogSearch(activeQuery);

  const dbBrands = useCatalogBrands();
  const brandFilter = mock || isSearching ? undefined : selectedBrandSlug;
  const { products } = useCatalogProducts({ enabled: mock });
  const { products: brandProducts, loading: brandProductsLoading } = useCatalogProducts({
    brand: brandFilter,
    enabled: !mock && !isSearching && Boolean(brandFilter),
  });
  const { ips: dbIps, loading: dbIpsLoading } = useCatalogIps(brandFilter);

  useEffect(() => {
    setDraft(activeQuery);
  }, [activeQuery]);

  const submitSearch = (raw: string) => {
    const q = raw.trim();
    if (q) setSearchParams({ q }, { replace: true });
    else setSearchParams({}, { replace: true });
  };

  const clearSearch = () => {
    setDraft('');
    setSearchParams({}, { replace: true });
  };

  const mockBrandCards = useMemo(
    () => [
      {
        slug: 'pop-mart',
        title: 'Pop Mart',
        image: brandLogoForSlug('pop-mart') ?? products[0]?.image,
      },
      {
        slug: 'jellycat',
        title: 'Jellycat',
        image: products[1]?.image ?? products[0]?.image,
      },
    ],
    [products]
  );

  const brandCards = useMemo(() => {
    if (mock) return mockBrandCards;
    return dbBrands.map((b) => {
      const slug = b.slug ?? b.name.toLowerCase().replace(/\s+/g, '-');
      return {
        slug,
        title: b.name,
        image: brandLogoForSlug(slug) ?? b.image,
      };
    });
  }, [mock, mockBrandCards, dbBrands]);

  useEffect(() => {
    if (isSearching || brandCards.length === 0) return;
    if (!selectedBrandSlug || !brandCards.some((b) => b.slug === selectedBrandSlug)) {
      setSelectedBrandSlug(brandCards[0].slug);
    }
  }, [brandCards, selectedBrandSlug, isSearching]);

  const selectedBrandTitle =
    brandCards.find((b) => b.slug === selectedBrandSlug)?.title ?? brandCards[0]?.title ?? '';

  const mockIpOptions = useMemo(() => {
    if (selectedBrandTitle !== 'Pop Mart') return [];
    const map = new Map<string, { ip: string; image?: string; count: number }>();
    for (const p of products) {
      const ip = deriveBrandLabel(p.title);
      if (!ip || ip === 'Pop Mart') continue;
      if (!map.has(ip)) map.set(ip, { ip, image: p.image, count: 0 });
      map.get(ip)!.count += 1;
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, 16);
  }, [products, selectedBrandTitle]);

  const apiIpOptions = useMemo(
    () =>
      dbIps.map((s) => ({
        ip: s.name,
        slug: s.slug,
        image: popmartIpImageForSlug(s.slug) ?? popmartIpImageForName(s.name) ?? s.image,
        count: s.count ?? 0,
      })),
    [dbIps]
  );

  const ipOptions = mock ? mockIpOptions : apiIpOptions;
  const showIpRow = !isSearching && ipOptions.length > 0;

  useEffect(() => {
    if (isSearching) return;
    setSelectedIp('');
  }, [selectedBrandSlug, isSearching]);

  useEffect(() => {
    if (isSearching || ipOptions.length === 0) return;
    if (!selectedIp || !ipOptions.some((x) => x.ip === selectedIp)) {
      setSelectedIp(ipOptions[0].ip);
    }
  }, [ipOptions, selectedIp, isSearching]);

  const productLineOptions = useMemo(() => {
    if (!selectedIp) return [];
    const map = new Map<string, { name: string; slug?: string; image?: string; count: number }>();
    const source = mock ? products : brandProducts;
    for (const p of source) {
      const ipName = mock ? deriveBrandLabel(p.title) : (p.ipName ?? '');
      if (ipName !== selectedIp) continue;
      const line = mock
        ? deriveSeriesName(p.title)
        : (p.seriesName ?? deriveSeriesName(p.title));
      if (line === FALLBACK_SERIES) continue;
      if (!map.has(line)) map.set(line, { name: line, slug: p.seriesSlug, image: p.image, count: 0 });
      map.get(line)!.count += 1;
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [mock, products, brandProducts, selectedIp]);

  const selectedIpMeta = ipOptions.find((x) => x.ip === selectedIp);
  const seriesOptions = productLineOptions;

  const resultEmpty =
    isSearching &&
    !searchLoading &&
    searchResult &&
    searchResult.brands.length === 0 &&
    searchResult.series.length === 0 &&
    searchResult.products.length === 0;

  return (
    <div className="w-full min-w-0 max-w-full overflow-x-hidden animate-in fade-in duration-500">
      <TopBar title="圖鑑" rightElement={<></>} />

      <div className="pt-topbar-content px-container-margin w-full min-w-0 max-w-full mx-auto">
        <section className="mb-2">
          <form
            className="ui-search"
            onSubmit={(e) => {
              e.preventDefault();
              submitSearch(draft);
            }}
          >
            <span className="material-symbols-outlined ui-search-icon">search</span>
            <input
              name="q"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="text-sm pr-10"
              placeholder="搜尋IP、系列或款式"
              type="search"
              enterKeyHint="search"
            />
            {(draft || activeQuery) && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-3 top-1/2 z-10 -translate-y-1/2 text-on-surface-variant"
                aria-label="清除搜尋"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            )}
          </form>
        </section>

        {isSearching && (
          <section className="pb-28 space-y-6">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-on-surface-variant">
                {searchLoading
                  ? '搜尋中…'
                  : `「${activeQuery}」的結果${
                      searchResult
                        ? `（${searchResult.brands.length + searchResult.series.length + searchResult.products.length} 筆）`
                        : ''
                    }`}
              </p>
            </div>

            {resultEmpty && (
              <div className="glass-card shadow-[4px_4px_0_#111] rounded-2xl p-5">
                <p className="text-sm text-on-surface-variant">找不到符合的圖鑑內容，請試試其他關鍵字。</p>
              </div>
            )}

            {searchResult && searchResult.brands.length > 0 && (
              <div>
                <p className="text-[10px] font-black text-secondary tracking-wider uppercase mb-2">品牌</p>
                <div className="flex flex-wrap gap-2">
                  {searchResult.brands.map((b) => (
                    <button
                      key={b.slug ?? b.name}
                      type="button"
                      onClick={() => go(`/brand/${encodeURIComponent(b.slug ?? b.name)}`)}
                      className="px-3 py-2 rounded-full border border-black/[0.12] bg-white text-xs font-bold text-on-surface active:scale-95"
                    >
                      {b.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {searchResult && searchResult.series.length > 0 && (
              <div className="space-y-3">
                <p className="text-[10px] font-black text-secondary tracking-wider uppercase">系列</p>
                {searchResult.series.map((s) => {
                  const brandSlug = s.brandSlug ?? '';
                  const href = mock
                    ? `/subseries?ip=${encodeURIComponent(s.brandName ?? '')}&name=${encodeURIComponent(s.name)}`
                    : `/subseries?brand=${encodeURIComponent(brandSlug)}&series=${encodeURIComponent(s.slug)}&name=${encodeURIComponent(s.name)}`;
                  return (
                    <button
                      key={`${brandSlug}-${s.slug}`}
                      type="button"
                      onClick={() => go(href)}
                      className="w-full glass-card shadow-[4px_4px_0_#111] rounded-2xl overflow-hidden flex items-center gap-4 p-4 text-left"
                    >
                      <div className="w-16 h-16 rounded-2xl overflow-hidden bg-neutral-100 shrink-0 border border-black/[0.08]">
                        {s.image ? (
                          <img src={s.image} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        {s.brandName && <p className="text-xs font-bold text-primary">{s.brandName}</p>}
                        <p className="card-title-2 text-sm font-extrabold leading-snug text-on-surface">{s.name}</p>
                        {s.count != null && s.count > 0 && (
                          <p className="text-[11px] text-on-surface-variant mt-1">{s.count} 款</p>
                        )}
                      </div>
                      <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
                    </button>
                  );
                })}
              </div>
            )}

            {searchResult && searchResult.products.length > 0 && (
              <div>
                <p className="text-[10px] font-black text-secondary tracking-wider uppercase mb-3">盲盒</p>
                <div className="grid grid-cols-3 gap-x-3 gap-y-5">
                  {searchResult.products.map((p) => (
                    <CatalogFigurineTile
                      key={p.id}
                      title={p.title}
                      image={p.image}
                      isWished={isWished(p.id)}
                      isOwned={isOwned(p.id)}
                      onClick={() => go(`/catalog/${p.id}`)}
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
              </div>
            )}
          </section>
        )}

        {!isSearching && (
          <>
            <section className="pt-0 pb-2">
              <p className="text-[10px] font-black text-accent-coral tracking-wider uppercase mb-2">BRAND</p>
              <div className="overflow-x-auto overflow-y-visible no-scrollbar -mx-1 px-1 py-2 pr-3">
                <div className="flex gap-3">
                  {brandCards.map((b) => {
                    const active = selectedBrandSlug === b.slug;
                    return (
                      <button
                        key={b.slug}
                        type="button"
                        onClick={() => setSelectedBrandSlug(b.slug)}
                        className="shrink-0 flex flex-col items-center"
                        aria-label={`選擇品牌：${b.title}`}
                        aria-pressed={active}
                      >
                        <div className="flex h-[96px] w-[96px] items-center justify-center">
                          <div
                            className={cn(
                              'rounded-3xl overflow-hidden border-[2.5px] shadow-[4px_4px_0_#111] bg-white transition-[width,height,opacity] duration-200',
                              active
                                ? 'h-[96px] w-[96px] border-accent-coral opacity-100'
                                : 'h-[72px] w-[72px] border-accent-coral/45 opacity-60'
                            )}
                          >
                            {b.image ? (
                              <img
                                src={b.image}
                                alt=""
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : null}
                          </div>
                        </div>
                        <div className="mt-1 text-center">
                          <div
                            className={cn(
                              'text-[11px] font-black leading-tight transition-colors',
                              active ? 'text-on-background' : 'text-on-surface-variant'
                            )}
                          >
                            {b.title}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            {showIpRow && (
              <section className="pb-2">
                <div className="flex items-end justify-between mb-2">
                  <p className="text-[10px] font-black text-accent-amber tracking-wider uppercase">IP</p>
                  {!mock && (
                    <p className="text-[10px] text-on-surface-variant">{ipOptions.length} 個 IP</p>
                  )}
                </div>

                {(dbIpsLoading || brandProductsLoading) && !mock ? (
                  <p className="text-sm text-on-surface-variant px-1">載入 IP…</p>
                ) : ipOptions.length === 0 ? (
                  <div className="glass-card rounded-2xl border-[2.5px] border-accent-amber p-5 shadow-[4px_4px_0_#111]">
                    <p className="text-sm text-on-surface-variant">此品牌暫無可用的 IP 資料。</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto overflow-y-visible no-scrollbar -mx-1 px-1 py-2 pr-3">
                    <div className="flex gap-4">
                      {ipOptions.map((ip) => {
                        const active = selectedIp === ip.ip;
                        return (
                          <button
                            key={ip.ip}
                            type="button"
                            onClick={() => setSelectedIp(ip.ip)}
                            className="shrink-0 flex flex-col items-center gap-2"
                            aria-label={`選擇 IP：${ip.ip}`}
                            aria-pressed={active}
                          >
                            <div className="flex h-[80px] w-[80px] items-center justify-center">
                              <div
                                className={cn(
                                  'rounded-full overflow-hidden border-[2.5px] bg-white shadow-[4px_4px_0_#111] transition-[width,height,opacity] duration-200',
                                  active
                                    ? 'h-[80px] w-[80px] border-accent-amber opacity-100'
                                    : 'h-[60px] w-[60px] border-accent-amber/45 opacity-60'
                                )}
                              >
                                {ip.image ? (
                                  <img
                                    src={ip.image}
                                    alt=""
                                    className="w-full h-full object-cover"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : null}
                              </div>
                            </div>
                            <span
                              className={cn(
                                'text-[11px] font-extrabold max-w-[96px] truncate transition-colors',
                                active ? 'text-on-background' : 'text-on-surface-variant'
                              )}
                            >
                              {ip.ip}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </section>
            )}

            <section className="pb-28">
              <div className="flex items-end justify-between mb-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-black text-accent-sky tracking-wider uppercase">SERIES</p>
                  <h2 className="text-lg font-extrabold text-on-background mt-1 truncate">
                    {selectedIp || selectedBrandTitle || '請先選擇品牌'}
                  </h2>
                  {selectedIpMeta && (
                    <p className="text-[11px] text-on-surface-variant mt-0.5">
                      {selectedBrandTitle} · {selectedIpMeta.count} 款
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                {selectedIp && seriesOptions.length === 0 && (
                  <div className="glass-card shadow-[4px_4px_0_#111] rounded-2xl p-5">
                    <p className="text-sm text-on-surface-variant">
                      {mock
                        ? '此 IP 暫無可辨識的系列。'
                        : '此 IP 暫無可辨識的系列名稱，請點上方 IP 或改用搜尋。'}
                    </p>
                  </div>
                )}

                {seriesOptions.map((s) => {
                  const lineSlug = s.slug ?? '';
                  const href = mock
                    ? `/subseries?ip=${encodeURIComponent(selectedIp)}&name=${encodeURIComponent(s.name)}`
                    : `/subseries?brand=${encodeURIComponent(selectedBrandSlug)}&series=${encodeURIComponent(lineSlug)}&name=${encodeURIComponent(s.name)}&ip=${encodeURIComponent(selectedIp)}`;
                  return (
                    <button
                      key={s.name}
                      type="button"
                      onClick={() => go(href)}
                      className="w-full glass-card shadow-[4px_4px_0_#111] rounded-2xl overflow-hidden flex items-center gap-4 p-4 text-left"
                    >
                      <div className="w-16 h-16 rounded-2xl overflow-hidden bg-neutral-100 shrink-0 border border-black/[0.08]">
                        {s.image ? (
                          <img src={s.image} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        {selectedIp && <p className="text-xs font-bold text-primary">{selectedIp}</p>}
                        <p className="card-title-2 text-sm font-extrabold leading-snug text-on-surface">{s.name}</p>
                        <p className="text-[11px] text-on-surface-variant mt-1">{s.count} 款</p>
                      </div>
                      <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
                    </button>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
