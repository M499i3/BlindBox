import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import TopBar from '@/frontend/presentation/components/TopBar';
import { useCatalogProducts, deriveBrandLabel } from '@/frontend/presentation/hooks/useCatalog';
import { popmartShowcase } from '@/frontend/lib/popmartShowcase';
export default function SearchResults() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQ = searchParams.get('q') ?? '';
  const [draft, setDraft] = useState(initialQ);
  const [showTagDetails, setShowTagDetails] = useState(false);
  const { products: results } = useCatalogProducts(initialQ ? { q: initialQ } : undefined);

  const deriveSeriesName = (title: string) => {
    const cleaned = title
      .replace(/^泡泡萌粒\s*/g, '')
      .replace(/(手辦|公仔|手办|盲盒|模型|挂件|掛件|周邊|周边)$/g, '')
      .trim();
    const m = cleaned.match(/([A-Za-z0-9\u4e00-\u9fff ×xX·\-\(\)（）]{2,32}?系列)/);
    return m?.[1]?.trim();
  };

  const deriveLeafLabel = (title: string, removeSeries?: string) => {
    const base = title
      .replace(/^泡泡萌粒\s*/g, '')
      .replace(/(手辦|公仔|手办|盲盒|模型|挂件|掛件|周邊|周边)$/g, '')
      .trim();
    const removed = removeSeries ? base.replace(removeSeries, '').trim() : base;
    const normalized = removed.replace(/\s+/g, ' ').trim();
    if (!normalized) return base;
    return normalized.length > 18 ? `${normalized.slice(0, 18)}…` : normalized;
  };

  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[’'"]/g, '')
      .trim();

  const queryMeta = useMemo(() => {
    const q = initialQ.trim();
    const nq = normalize(q);
    const ipHints = (popmartShowcase as any).ipHints as string[] | undefined;
    const ipList = ipHints?.length
      ? ipHints.map((x) => x.toLowerCase())
      : ['skullpanda', 'pucky', 'chaka', 'dimoo', 'labubu', 'molly', 'hirono'];

    const ip = ipList.find((x) => nq.includes(x)) ?? undefined;
    const brand = nq.includes('popmart') || nq.includes('pop mart') || nq.includes('泡泡') ? 'Pop Mart' : undefined;
    const series = q.includes('系列') ? (q.match(/(.{2,32}?系列)/)?.[1] ?? undefined) : undefined;

    const bestExact =
      q && results.length
        ? results
            .map((p) => {
              const score =
                normalize(p.title) === nq ? 100 :
                normalize(p.title).includes(nq) ? 80 :
                nq && normalize(p.title).includes(nq.split(' ')[0] ?? '') ? 60 :
                0;
              return { p, score };
            })
            .sort((a, b) => b.score - a.score)[0]
        : undefined;

    const level =
      bestExact?.score === 100 || (results.length === 1 && q.length >= 3) ? 4 :
      series && ip ? 3 :
      ip || series ? 2 :
      brand || ip ? 1 :
      0;

    return {
      q,
      nq,
      ip: ip ? ip.toUpperCase() : undefined,
      brand,
      series,
      level,
      bestProduct: bestExact?.score ? bestExact.p : undefined,
    };
  }, [initialQ, results]);

  const entityInfo = useMemo(() => {
    if (!queryMeta.q) return null;
    const pool = results.slice(0, 120);
    const ip = queryMeta.ip
      ? queryMeta.ip === 'DIMOO'
        ? 'Dimoo'
        : queryMeta.ip
      : undefined;
    const key = queryMeta.series ?? ip ?? queryMeta.brand ?? queryMeta.q;

    const seriesList = Array.from(
      new Set(pool.map((p) => deriveSeriesName(p.title)).filter(Boolean) as string[])
    ).slice(0, 8);

    const productCount = results.length;

    return {
      key,
      ip,
      seriesList,
      productCount,
    };
  }, [queryMeta, results]);

  const bannerMeta = useMemo(() => {
    if (!initialQ.trim()) return null;

    const picked = results[0] ?? queryMeta.bestProduct ?? popmartShowcase.products[0];
    const image = picked?.image;

    const ip = entityInfo?.ip;
    const ipIntroMap: Record<string, string> = {
      Dimoo:
        'The works in the DIMOO WORLD series are filled with dreamlike beauty. The main storyline revolves around a little boy named DIMOO. In real life, DIMOO is confused and lost. After entering the mysterious dream world, he meets various friends who grow up with him.',
      LABUBU:
        'LABUBU lives in a mysterious forest. With sharp teeth and a mischievous smile, it always jumps into adventures and surprises.',
      Molly:
        'Molly is a curious little girl with a signature pout. Her stories blend everyday innocence with collectible charm.',
      SKULLPANDA:
        'SKULLPANDA explores emotions and alter-egos through bold styling and theatrical scenes, creating a distinctive collectible universe.',
      PUCKY:
        'PUCKY builds soft, whimsical worlds inspired by nature, fantasy, and daydreams—gentle yet full of detail.',
      CHAKA:
        'CHAKA brings playful characters and warm storytelling, mixing cuteness with a hint of quirky personality.',
    };

    const title = entityInfo?.key ?? initialQ;
    const subtitle =
      (queryMeta.series && ip)
        ? `${ip} • 系列`
        : ip
          ? `${ip} • IP`
          : queryMeta.brand
            ? `${queryMeta.brand} • 品牌`
            : '搜尋結果';

    const intro =
      (ip && ipIntroMap[ip]) ||
      (queryMeta.series
        ? '以此系列為主軸，探索中盒、款式與相關商品。'
        : '在此層級下瀏覽推薦系列與商品。');

    return { title, subtitle, intro, image };
  }, [entityInfo?.ip, entityInfo?.key, initialQ, queryMeta.brand, queryMeta.series, queryMeta.bestProduct, results]);

  const breadcrumb = useMemo(() => {
    if (!initialQ.trim()) return [];
    const ip = entityInfo?.ip;
    const brand = queryMeta.brand ?? (ip ? 'Pop Mart' : undefined) ?? 'Pop Mart';
    const parts: { label: string; to?: string }[] = [
      { label: '首頁', to: '/' },
      { label: brand, to: `/search?q=${encodeURIComponent(brand)}` },
    ];
    if (ip) parts.push({ label: ip, to: `/search?q=${encodeURIComponent(ip)}` });
    if (queryMeta.series) parts.push({ label: queryMeta.series });
    return parts;
  }, [entityInfo?.ip, initialQ, queryMeta.brand, queryMeta.series]);

  const tagGroups = useMemo(() => {
    if (!initialQ.trim()) return null;

    const resultPool = results.slice(0, 220);

    const brandSet = new Set<string>(['Pop Mart']);

    const ipSetFromResults = new Set<string>();
    const seriesSetFromResults = new Set<string>();

    for (const p of resultPool) {
      const ip = deriveBrandLabel(p.title);
      if (ip && ip !== 'Pop Mart') ipSetFromResults.add(ip);

      const s = deriveSeriesName(p.title);
      if (s) seriesSetFromResults.add(s);
    }

    // 若目前停在「品牌層級」（例如搜尋 Pop Mart），IP 需列出全站所有 IP
    const isBrandLevel = Boolean(queryMeta.brand) && !queryMeta.ip && !queryMeta.series;
    const ipSource = isBrandLevel ? popmartShowcase.products : resultPool;
    const ipSet = new Set<string>();
    for (const p of ipSource) {
      const ip = deriveBrandLabel(p.title);
      if (ip && ip !== 'Pop Mart') ipSet.add(ip);
    }

    const brands = Array.from(brandSet).slice(0, 6);
    const ips = Array.from(ipSet).slice(0, 24);
    const series = Array.from(seriesSetFromResults).slice(0, 24);

    return {
      isBrandLevel,
      counts: {
        brand: brandSet.size,
        ip: ipSet.size,
        series: seriesSetFromResults.size,
      },
      brands: brands.map((x) => ({ label: x, to: `/search?q=${encodeURIComponent(x)}` })),
      ips: ips.map((x) => ({ label: x, to: `/search?q=${encodeURIComponent(x)}` })),
      series: series.map((x) => ({ label: x, to: `/search?q=${encodeURIComponent(x)}` })),
    };
  }, [initialQ, queryMeta.brand, queryMeta.ip, queryMeta.series, results]);

  const nextLayerTags = useMemo(() => {
    if (!initialQ.trim()) return null;

    const isBrandLevel = Boolean(queryMeta.brand) && !queryMeta.ip && !queryMeta.series;
    const isIpLevel = Boolean(queryMeta.ip) && !queryMeta.series;
    const isSeriesLevel = Boolean(queryMeta.series);

    if (isBrandLevel) {
      const ipSet = new Set<string>();
      for (const p of popmartShowcase.products) {
        const ip = deriveBrandLabel(p.title);
        if (ip && ip !== 'Pop Mart') ipSet.add(ip);
      }
      return {
        title: 'IP',
        items: Array.from(ipSet)
          .slice(0, 24)
          .map((x) => ({ label: x, to: `/search?q=${encodeURIComponent(x)}` })),
      };
    }

    if (isIpLevel) {
      const seriesSet = new Set<string>();
      for (const p of results.slice(0, 220)) {
        const s = deriveSeriesName(p.title);
        if (s) seriesSet.add(s);
      }
      return {
        title: '系列',
        items: Array.from(seriesSet)
          .slice(0, 24)
          .map((x) => ({ label: x, to: `/search?q=${encodeURIComponent(x)}` })),
      };
    }

    if (isSeriesLevel) {
      const leaf = results
        .slice(0, 80)
        .map((p) => ({ id: p.id, label: deriveLeafLabel(p.title, queryMeta.series), to: `/product/${p.id}` }))
        .filter((x) => x.label.trim().length >= 2);
      const seen = new Set<string>();
      const uniq: { label: string; to: string }[] = [];
      for (const x of leaf) {
        const k = x.label.toLowerCase();
        if (seen.has(k)) continue;
        seen.add(k);
        uniq.push({ label: x.label, to: x.to });
        if (uniq.length >= 16) break;
      }
      return {
        title: '商品',
        items: uniq,
      };
    }

    // fallback: show IPs from current result pool
    const ipSet = new Set<string>();
    for (const p of results.slice(0, 220)) {
      const ip = deriveBrandLabel(p.title);
      if (ip && ip !== 'Pop Mart') ipSet.add(ip);
    }
    return {
      title: 'IP',
      items: Array.from(ipSet)
        .slice(0, 24)
        .map((x) => ({ label: x, to: `/search?q=${encodeURIComponent(x)}` })),
    };
  }, [initialQ, queryMeta.brand, queryMeta.ip, queryMeta.series, results]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = draft.trim();
    setSearchParams(q ? { q } : {});
  };

  return (
    <div className="animate-in fade-in duration-500 pb-28">
      <TopBar title="搜尋" showBack />

      <main className="pt-20 px-container-margin space-y-8 max-w-md mx-auto">
        <form onSubmit={submit} className="ui-search">
          <span className="material-symbols-outlined ui-search-icon">search</span>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="text-sm"
            placeholder="品牌、系列、商品關鍵字…"
            type="search"
          />
        </form>

        {initialQ && (
          <section className="space-y-4">
            {/* Breadcrumb */}
            {breadcrumb.length > 0 && (
              <nav className="text-[11px] font-semibold text-on-surface-variant">
                <ol className="flex flex-wrap items-center gap-1.5">
                  {breadcrumb.map((b, i) => (
                    <li key={`${b.label}-${i}`} className="flex items-center gap-1.5 min-w-0">
                      {i !== 0 && <span className="opacity-70">/</span>}
                      {b.to ? (
                        <button
                          type="button"
                          onClick={() => navigate(b.to!)}
                          className="truncate hover:text-on-surface transition-colors"
                          aria-label={`前往 ${b.label}`}
                        >
                          {b.label}
                        </button>
                      ) : (
                        <span className="truncate text-on-surface">{b.label}</span>
                      )}
                    </li>
                  ))}
                </ol>
              </nav>
            )}

            {/* Banner */}
            {bannerMeta && (
              <section className="glass-card rounded-3xl overflow-hidden">
                <div className="relative aspect-[16/10] max-h-[280px] bg-neutral-100">
                  {bannerMeta.image && (
                    <img
                      src={bannerMeta.image}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
                  <div className="absolute bottom-0 left-0 p-5 w-full">
                    <p className="text-[10px] font-black tracking-widest uppercase text-white/85">
                      {bannerMeta.subtitle}
                    </p>
                    <h2 className="text-2xl font-extrabold text-white mt-1 leading-tight">
                      {bannerMeta.title}
                    </h2>
                    <p className="text-white/85 text-xs mt-2 leading-relaxed line-clamp-4">
                      {bannerMeta.intro}
                    </p>
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <p className="text-[11px] text-white/80 font-semibold">
                        約 {results.length} 筆結果（官網同步資料）
                      </p>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Collapsible tags by hierarchy */}
            {tagGroups && (
              <section className="elevated-card rounded-2xl p-4 border border-secondary/25">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[9px] font-black text-secondary tracking-wider uppercase">
                      {nextLayerTags?.title ?? '標籤'}
                    </p>
                    <p className="text-[11px] text-on-surface-variant mt-1"></p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setShowTagDetails((v) => !v)}
                      className="text-xs font-bold text-secondary"
                      aria-expanded={showTagDetails}
                    >
                      {showTagDetails ? '收合' : '查看'}
                    </button>
                  </div>
                </div>

                {nextLayerTags?.items?.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {nextLayerTags.items.map((t) => (
                      <button
                        key={t.to}
                        type="button"
                        onClick={() => navigate(t.to)}
                        className="bg-surface border border-secondary/35 px-3.5 py-1 rounded-full text-[12px] font-semibold text-on-surface hover:border-secondary hover:bg-secondary/10 transition-colors"
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-on-surface-variant">此條件下暫無可列出的標籤。</p>
                )}

                {showTagDetails && (
                  <div className="mt-4 space-y-3">
                    <details open className="group rounded-2xl bg-background/60 border border-secondary/25 px-4 py-3">
                      <summary className="cursor-pointer select-none flex items-center justify-between gap-2">
                        <span className="text-sm font-extrabold text-on-surface">品牌</span>
                        <span className="inline-flex items-center gap-2">
                          <span className="text-[11px] font-bold text-on-surface-variant">
                            {tagGroups.counts.brand}
                          </span>
                          <span className="material-symbols-outlined text-[20px] text-on-surface-variant transition-transform group-open:rotate-180">
                            expand_more
                          </span>
                        </span>
                      </summary>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {tagGroups.brands.map((t) => (
                          <button
                            key={t.to}
                            type="button"
                            onClick={() => navigate(t.to)}
                            className="bg-surface border border-secondary/35 px-3.5 py-1 rounded-full text-[12px] font-semibold text-on-surface hover:border-secondary hover:bg-secondary/10 transition-colors"
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>
                    </details>

                    <details className="group rounded-2xl bg-background/60 border border-secondary/25 px-4 py-3">
                      <summary className="cursor-pointer select-none flex items-center justify-between gap-2">
                        <span className="text-sm font-extrabold text-on-surface">IP</span>
                        <span className="inline-flex items-center gap-2">
                          <span className="text-[11px] font-bold text-on-surface-variant">
                            {tagGroups.counts.ip}
                          </span>
                          <span className="material-symbols-outlined text-[20px] text-on-surface-variant transition-transform group-open:rotate-180">
                            expand_more
                          </span>
                        </span>
                      </summary>
                      <div className="mt-3 max-h-40 overflow-auto no-scrollbar pr-1">
                        <div className="flex flex-wrap gap-2">
                          {tagGroups.ips.length > 0 ? (
                            tagGroups.ips.map((t) => (
                              <button
                                key={t.to}
                                type="button"
                                onClick={() => navigate(t.to)}
                                className="bg-surface border border-secondary/35 px-3.5 py-1 rounded-full text-[12px] font-semibold text-on-surface hover:border-secondary hover:bg-secondary/10 transition-colors"
                              >
                                {t.label}
                              </button>
                            ))
                          ) : (
                            <p className="text-xs text-on-surface-variant py-1">此條件下暫無可列出的 IP。</p>
                          )}
                        </div>
                      </div>
                    </details>

                    <details className="group rounded-2xl bg-background/60 border border-secondary/25 px-4 py-3">
                      <summary className="cursor-pointer select-none flex items-center justify-between gap-2">
                        <span className="text-sm font-extrabold text-on-surface">系列</span>
                        <span className="inline-flex items-center gap-2">
                          <span className="text-[11px] font-bold text-on-surface-variant">
                            {tagGroups.counts.series}
                          </span>
                          <span className="material-symbols-outlined text-[20px] text-on-surface-variant transition-transform group-open:rotate-180">
                            expand_more
                          </span>
                        </span>
                      </summary>
                      <div className="mt-3 max-h-44 overflow-auto no-scrollbar pr-1">
                        <div className="flex flex-wrap gap-2">
                          {tagGroups.series.length > 0 ? (
                            tagGroups.series.map((t) => (
                              <button
                                key={t.to}
                                type="button"
                                onClick={() => navigate(t.to)}
                                className="bg-surface border border-secondary/35 px-3.5 py-1 rounded-full text-[12px] font-semibold text-on-surface hover:border-secondary hover:bg-secondary/10 transition-colors"
                              >
                                {t.label}
                              </button>
                            ))
                          ) : (
                            <p className="text-xs text-on-surface-variant py-1">此條件下暫無可列出的系列。</p>
                          )}
                        </div>
                      </div>
                    </details>
                  </div>
                )}
              </section>
            )}
          </section>
        )}

        {initialQ ? (
          <section>
            <h2 className="text-sm font-bold text-on-surface mb-3">
              {queryMeta.level === 4
                ? '猜你要找這款'
                : queryMeta.level === 3
                  ? '推薦中盒 / 子系列'
                  : '推薦商品'}
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {results.slice(0, queryMeta.level === 4 ? 1 : 12).map((p) => (
                <motion.button
                  key={p.id}
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate(`/product/${p.id}`)}
                  className="glass-card rounded-2xl overflow-hidden text-left"
                >
                  <div className="aspect-square bg-neutral-100">
                    <img
                      src={p.image}
                      alt=""
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="p-3">
                    <p className="text-[10px] font-semibold text-primary mb-0.5">
                      {deriveBrandLabel(p.title)}
                    </p>
                    <p className="text-xs font-bold text-on-surface line-clamp-2 leading-snug">
                      {p.title}
                    </p>
                    <p className="text-xs font-bold text-primary mt-1">{p.price}</p>
                  </div>
                </motion.button>
              ))}
            </div>
            {results.length === 0 && (
              <p className="text-sm text-on-surface-variant text-center py-12">
                沒有符合的商品，試試其他關鍵字或從品牌進入。
              </p>
            )}
          </section>
        ) : (
          <section className="space-y-3">
            <h2 className="text-sm font-bold text-on-surface">熱門（官網新品）</h2>
            <div className="grid grid-cols-2 gap-3">
              {popularProducts.map((p) => (
                <motion.button
                  key={p.id}
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate(`/product/${p.id}`)}
                  className="glass-card rounded-2xl overflow-hidden text-left"
                >
                  <div className="aspect-square bg-neutral-100">
                    <img
                      src={p.image}
                      alt=""
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="p-3">
                    <p className="text-xs font-bold text-on-surface line-clamp-2">{p.title}</p>
                    <p className="text-xs font-bold text-primary mt-1">{p.price}</p>
                  </div>
                </motion.button>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
