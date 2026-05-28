import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '@/frontend/presentation/components/TopBar';
import { cn } from '@/frontend/shared/utils/cn';
import { useCatalogProducts, deriveBrandLabel } from '@/frontend/presentation/hooks/useCatalog';

export default function Explore() {
  const navigate = useNavigate();
  const [catalogQuery, setCatalogQuery] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('Pop Mart');
  const [selectedIp, setSelectedIp] = useState<string>('');

  const { products } = useCatalogProducts();

  const deriveSeriesName = (title: string) => {
    const cleaned = title
      .replace(/^泡泡萌粒\s*/g, '')
      .replace(/(手辦|公仔|手办|盲盒|模型|挂件|掛件|周邊|周边)$/g, '')
      .trim();
    const m = cleaned.match(/([A-Za-z0-9\u4e00-\u9fff ×xX·\-\(\)（）]{2,32}?系列)/);
    return m?.[1]?.trim();
  };

  const brandCards = useMemo(
    () => [
      {
        id: 'pop-mart',
        title: 'Pop Mart',
        image: products[0]?.image,
        to: '/brand/pop-mart',
        ownedKey: 'brand:pop-mart',
      },
      {
        id: 'jellycat',
        title: 'Jellycat',
        image: products[1]?.image ?? products[0]?.image,
        to: '/brand/jellycat',
        ownedKey: 'brand:jellycat',
      },
    ],
    [products]
  );

  const brandOptions = useMemo(() => brandCards, [brandCards]);

  const ipOptions = useMemo(() => {
    // 目前資料主要是 Pop Mart；其他品牌先顯示空狀態（保留 UI 結構）
    if (selectedBrand !== 'Pop Mart') return [];
    const map = new Map<string, { ip: string; image?: string; count: number }>();
    for (const p of products) {
      const ip = deriveBrandLabel(p.title);
      if (!ip || ip === 'Pop Mart') continue;
      if (!map.has(ip)) map.set(ip, { ip, image: p.image, count: 0 });
      map.get(ip)!.count += 1;
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, 16);
  }, [products, selectedBrand, deriveBrandLabel]);

  useEffect(() => {
    if (selectedBrand !== 'Pop Mart') {
      setSelectedIp('');
      return;
    }
    if (ipOptions.length === 0) {
      setSelectedIp('');
      return;
    }
    if (!selectedIp || !ipOptions.some((x) => x.ip === selectedIp)) {
      setSelectedIp(ipOptions[0].ip);
    }
  }, [ipOptions, selectedBrand, selectedIp]);

  const seriesOptions = useMemo(() => {
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

  return (
    <div className="w-full min-w-0 max-w-full overflow-x-hidden animate-in fade-in duration-500">
      <TopBar title="圖鑑" rightElement={<></>} />

      <div className="pt-topbar-content px-container-margin w-full min-w-0 max-w-full mx-auto">
        {/* Search Bar (置頂) */}
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

        {/* Brand slider */}
        <section className="pt-0 pb-2">
          <p className="text-[10px] font-black text-secondary tracking-wider uppercase mb-2">BRAND</p>
          <div className="overflow-x-auto overflow-y-visible no-scrollbar -mx-1 px-1 py-2 pr-3">
            <div className="flex gap-3">
              {brandOptions.map((b) => {
                const active = selectedBrand === b.title;
                return (
                  <button key={b.id} type="button" onClick={() => setSelectedBrand(b.title)} className="shrink-0 flex flex-col items-center" aria-label={`選擇品牌：${b.title}`} aria-pressed={active}>
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
                      <div className={cn('text-[11px] font-black leading-tight transition-colors', active ? 'text-on-background' : 'text-on-surface-variant')}>
                        {b.title === 'Pop Mart' ? 'POP MART' : b.title}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* IP avatars */}
        <section className="pb-2">
          <div className="flex items-end justify-between mb-2">
            <p className="text-[10px] font-black text-secondary tracking-wider uppercase">IP</p>
          </div>

          {ipOptions.length === 0 ? (
            <div className="glass-card rounded-2xl p-5">
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
                              ? 'h-[80px] w-[80px] border-secondary opacity-100'
                              : 'h-[60px] w-[60px] border-outline opacity-60'
                          )}
                        >
                        {ip.image ? (
                          <img src={ip.image} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : null}
                        </div>
                      </div>
                      <span className={cn('text-[11px] font-extrabold max-w-[96px] truncate transition-colors', active ? 'text-on-background' : 'text-on-surface-variant')}>
                        {ip.ip}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* Series list */}
        <section className="pb-28">
          <div className="flex items-end justify-between mb-3">
            <div className="min-w-0">
              <p className="text-[10px] font-black text-secondary tracking-wider uppercase">SERIES</p>
              <h2 className="text-lg font-extrabold text-on-background mt-1 truncate">
                {selectedIp ? selectedIp : '請先選擇 IP'}
              </h2>
            </div>
          </div>

          <div className="space-y-3">
            {selectedIp && seriesOptions.length === 0 && (
              <div className="glass-card shadow-[4px_4px_0_#111] rounded-2xl p-5">
                <p className="text-sm text-on-surface-variant">此 IP 暫無可辨識的系列。</p>
              </div>
            )}

            {seriesOptions.map((s) => (
              <button
                key={s.name}
                type="button"
                onClick={() => navigate(`/subseries?ip=${encodeURIComponent(selectedIp)}&name=${encodeURIComponent(s.name)}`)}
                className="w-full glass-card shadow-[4px_4px_0_#111] rounded-2xl overflow-hidden flex items-center gap-4 p-4 text-left"
              >
                <div className="w-16 h-16 rounded-2xl overflow-hidden bg-neutral-100 shrink-0 border border-black/[0.08]">
                  {s.image ? (
                    <img src={s.image} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-primary">{selectedIp}</p>
                  <p className="text-sm font-extrabold text-on-surface line-clamp-2 leading-snug">{s.name}</p>
                  <p className="text-[11px] text-on-surface-variant mt-1">{s.count} 款</p>
                </div>
                <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
