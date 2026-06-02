import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '@/frontend/presentation/components/TopBar';
import { cn } from '@/frontend/shared/utils/cn';
import {
  deriveBrandLabel,
  useCatalogBrands,
  useCatalogProducts,
  useCatalogSeries,
} from '@/frontend/presentation/hooks/useCatalog';
import { isMockDataEnabled } from '@/frontend/lib/popmartShowcase';

export default function Explore() {
  const navigate = useNavigate();
  const mock = isMockDataEnabled();
  const [catalogQuery, setCatalogQuery] = useState('');
  const [selectedBrandSlug, setSelectedBrandSlug] = useState('');
  const [selectedIp, setSelectedIp] = useState<string>('');

  const dbBrands = useCatalogBrands();
  const { products } = useCatalogProducts();
  const { series: dbSeries } = useCatalogSeries(mock ? undefined : selectedBrandSlug);

  const deriveSeriesName = (title: string) => {
    const cleaned = title
      .replace(/^泡泡萌粒\s*/g, '')
      .replace(/(手辦|公仔|手办|盲盒|模型|挂件|掛件|周邊|周边)$/g, '')
      .trim();
    const m = cleaned.match(/([A-Za-z0-9\u4e00-\u9fff ×xX·\-\(\)（）]{2,32}?系列)/);
    return m?.[1]?.trim();
  };

  const mockBrandCards = useMemo(
    () => [
      {
        slug: 'pop-mart',
        title: 'Pop Mart',
        image: products[0]?.image,
        to: '/brand/pop-mart',
      },
      {
        slug: 'jellycat',
        title: 'Jellycat',
        image: products[1]?.image ?? products[0]?.image,
        to: '/brand/jellycat',
      },
    ],
    [products]
  );

  const brandCards = useMemo(() => {
    if (mock) return mockBrandCards;
    return dbBrands.map((b) => ({
      slug: b.slug ?? b.name.toLowerCase().replace(/\s+/g, '-'),
      title: b.name,
      image: b.image,
      to: `/brand/${encodeURIComponent(b.slug ?? b.name)}`,
    }));
  }, [mock, mockBrandCards, dbBrands]);

  useEffect(() => {
    if (brandCards.length === 0) return;
    if (!selectedBrandSlug || !brandCards.some((b) => b.slug === selectedBrandSlug)) {
      setSelectedBrandSlug(brandCards[0].slug);
    }
  }, [brandCards, selectedBrandSlug]);

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
  }, [products, selectedBrandTitle, deriveBrandLabel]);

  useEffect(() => {
    if (mock) {
      if (selectedBrandTitle !== 'Pop Mart') {
        setSelectedIp('');
        return;
      }
      if (mockIpOptions.length === 0) {
        setSelectedIp('');
        return;
      }
      if (!selectedIp || !mockIpOptions.some((x) => x.ip === selectedIp)) {
        setSelectedIp(mockIpOptions[0].ip);
      }
      return;
    }
    setSelectedIp('');
  }, [mock, mockIpOptions, selectedBrandTitle, selectedIp]);

  const mockSeriesOptions = useMemo(() => {
    if (!selectedIp) return [];
    const map = new Map<string, { name: string; image?: string; count: number }>();
    for (const p of products) {
      if (deriveBrandLabel(p.title) !== selectedIp) continue;
      const s = deriveSeriesName(p.title);
      if (!s) continue;
      if (!map.has(s)) map.set(s, { name: s, image: p.image, count: 0 });
      map.get(s)!.count += 1;
    }
    const q = catalogQuery.trim();
    const list = Array.from(map.values());
    const filtered = q ? list.filter((x) => x.name.includes(q)) : list;
    return filtered.sort((a, b) => b.count - a.count).slice(0, 40);
  }, [products, selectedIp, catalogQuery, deriveBrandLabel, deriveSeriesName]);

  const dbSeriesOptions = useMemo(() => {
    const q = catalogQuery.trim();
    let list = dbSeries.map((s) => ({
      slug: s.slug,
      name: s.name,
      image: s.image,
      count: s.count ?? 0,
    }));
    if (q) list = list.filter((x) => x.name.includes(q));
    return list;
  }, [dbSeries, catalogQuery]);

  const seriesOptions = mock ? mockSeriesOptions : dbSeriesOptions;

  return (
    <div className="w-full min-w-0 max-w-full overflow-x-hidden animate-in fade-in duration-500">
      <TopBar title="圖鑑" rightElement={<></>} />

      <div className="pt-topbar-content px-container-margin w-full min-w-0 max-w-full mx-auto">
        <section className="mb-2">
          <div className="ui-search">
            <span className="material-symbols-outlined ui-search-icon">search</span>
            <input
              value={catalogQuery}
              onChange={(e) => setCatalogQuery(e.target.value)}
              className="text-sm"
              placeholder="搜尋系列"
              type="search"
            />
          </div>
        </section>

        <section className="pt-0 pb-2">
          <p className="text-[10px] font-black text-secondary tracking-wider uppercase mb-2">BRAND</p>
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
                            ? 'h-[96px] w-[96px] border-secondary opacity-100'
                            : 'h-[72px] w-[72px] border-outline opacity-60'
                        )}
                      >
                        {b.image ? (
                          <img src={b.image} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
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

        {mock && (
          <section className="pb-2">
            <div className="flex items-end justify-between mb-2">
              <p className="text-[10px] font-black text-secondary tracking-wider uppercase">IP</p>
            </div>

            {mockIpOptions.length === 0 ? (
              <div className="glass-card rounded-2xl p-5">
                <p className="text-sm text-on-surface-variant">此品牌暫無可用的 IP 資料。</p>
              </div>
            ) : (
              <div className="overflow-x-auto overflow-y-visible no-scrollbar -mx-1 px-1 py-2 pr-3">
                <div className="flex gap-4">
                  {mockIpOptions.map((ip) => {
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
                                ? 'h-[80px] w-[80px] border-secondary opacity-100'
                                : 'h-[60px] w-[60px] border-outline opacity-60'
                            )}
                          >
                            {ip.image ? (
                              <img src={ip.image} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
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
              <p className="text-[10px] font-black text-secondary tracking-wider uppercase">SERIES</p>
              <h2 className="text-lg font-extrabold text-on-background mt-1 truncate">
                {mock ? (selectedIp || '請先選擇 IP') : selectedBrandTitle || '請先選擇品牌'}
              </h2>
            </div>
          </div>

          <div className="space-y-3">
            {(mock ? selectedIp : selectedBrandSlug) && seriesOptions.length === 0 && (
              <div className="glass-card shadow-[4px_4px_0_#111] rounded-2xl p-5">
                <p className="text-sm text-on-surface-variant">
                  {mock ? '此 IP 暫無可辨識的系列。' : '此品牌暫無系列，請先執行圖鑑種子匯入。'}
                </p>
              </div>
            )}

            {seriesOptions.map((s) => {
              const seriesSlug = 'slug' in s ? s.slug : undefined;
              const href = mock
                ? `/subseries?ip=${encodeURIComponent(selectedIp)}&name=${encodeURIComponent(s.name)}`
                : `/subseries?brand=${encodeURIComponent(selectedBrandSlug)}&series=${encodeURIComponent(seriesSlug ?? '')}&name=${encodeURIComponent(s.name)}`;
              return (
                <button
                  key={seriesSlug ?? s.name}
                  type="button"
                  onClick={() => navigate(href)}
                  className="w-full glass-card shadow-[4px_4px_0_#111] rounded-2xl overflow-hidden flex items-center gap-4 p-4 text-left"
                >
                  <div className="w-16 h-16 rounded-2xl overflow-hidden bg-neutral-100 shrink-0 border border-black/[0.08]">
                    {s.image ? (
                      <img src={s.image} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    {!mock && <p className="text-xs font-bold text-primary">{selectedBrandTitle}</p>}
                    {mock && selectedIp && <p className="text-xs font-bold text-primary">{selectedIp}</p>}
                    <p className="text-sm font-extrabold text-on-surface line-clamp-2 leading-snug">{s.name}</p>
                    <p className="text-[11px] text-on-surface-variant mt-1">{s.count} 款</p>
                  </div>
                  <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
