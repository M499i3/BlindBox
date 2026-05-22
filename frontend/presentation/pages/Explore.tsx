import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import TopBar from '@/frontend/presentation/components/TopBar';
import { useAppState } from '@/frontend/presentation/providers/AppStateProvider';
import { cn } from '@/frontend/shared/utils/cn';
import { useCatalogProducts, deriveBrandLabel } from '@/frontend/presentation/hooks/useCatalog';

export default function Explore() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'gallery' | 'collection'>('gallery');
  const [subTab, setSubTab] = useState<'catalog' | 'wishlist'>('catalog');
  const { toggleOwned, isOwned, toggleWish, isWished, ownedIds, wishIds } = useAppState();
  const [catalogQuery, setCatalogQuery] = useState('');
  const [collectionPath, setCollectionPath] = useState<{ brand?: string; ip?: string; series?: string }>({});

  useEffect(() => {
    const tab = searchParams.get('tab');
    const sub = searchParams.get('sub');
    if (tab === 'collection') setActiveTab('collection');
    if (tab === 'gallery') setActiveTab('gallery');
    if (sub === 'wishlist') setSubTab('wishlist');
    if (sub === 'catalog') setSubTab('catalog');
  }, [searchParams]);

  const { products } = useCatalogProducts();

  const deriveSeriesName = (title: string) => {
    const cleaned = title
      .replace(/^泡泡萌粒\s*/g, '')
      .replace(/(手辦|公仔|手办|盲盒|模型|挂件|掛件|周邊|周边)$/g, '')
      .trim();
    const m = cleaned.match(/([A-Za-z0-9\u4e00-\u9fff ×xX·\-\(\)（）]{2,32}?系列)/);
    return m?.[1]?.trim();
  };

  const ownedCoverageSet = useMemo(() => {
    // 支援收藏位階：品牌 / IP / 系列 / 商品
    // 相容舊 key：
    // - series:<ip> 代表收藏 IP
    // - subseries:<ip>:<series> 代表收藏 系列
    const set = new Set<string>();
    const ownedKeySet = new Set(ownedIds);
    const productIdSet = new Set(products.map((p) => p.id));

    // 商品：直接是 product id
    for (const k of ownedIds) {
      if (productIdSet.has(k)) set.add(k);
    }

    // 品牌：目前資料主要是 Pop Mart
    const brandOwned =
      ownedKeySet.has('brand:pop-mart') ||
      ownedKeySet.has('brand:Pop Mart') ||
      ownedKeySet.has('brand:popmart');
    if (brandOwned) {
      for (const p of products) set.add(p.id);
      return set;
    }

    // IP
    const ownedIps = new Set<string>();
    for (const k of ownedIds) {
      if (k.startsWith('ip:')) ownedIps.add(k.slice('ip:'.length));
      if (k.startsWith('series:') && !k.includes(':', 'series:'.length)) {
        // legacy: series:<ip>
        ownedIps.add(k.slice('series:'.length));
      }
    }
    if (ownedIps.size) {
      for (const p of products) {
        const ip = deriveBrandLabel(p.title);
        if (ownedIps.has(ip)) set.add(p.id);
      }
    }

    // 系列
    const ownedSeries = new Set<string>(); // key: ip__series
    for (const k of ownedIds) {
      if (k.startsWith('series:') && k.split(':').length >= 3) {
        // new: series:<ip>:<series>
        const rest = k.slice('series:'.length);
        const idx = rest.indexOf(':');
        if (idx > 0) ownedSeries.add(`${rest.slice(0, idx)}__${rest.slice(idx + 1)}`);
      }
      if (k.startsWith('subseries:')) {
        // legacy: subseries:<ip>:<series>
        const rest = k.slice('subseries:'.length);
        const idx = rest.indexOf(':');
        if (idx > 0) ownedSeries.add(`${rest.slice(0, idx)}__${rest.slice(idx + 1)}`);
      }
    }
    if (ownedSeries.size) {
      for (const p of products) {
        const ip = deriveBrandLabel(p.title);
        const s = deriveSeriesName(p.title);
        if (!s) continue;
        if (ownedSeries.has(`${ip}__${s}`)) set.add(p.id);
      }
    }

    return set;
  }, [deriveBrandLabel, deriveSeriesName, ownedIds, products]);

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

  const ownedProducts = useMemo(() => {
    return products.filter((p) => ownedCoverageSet.has(p.id));
  }, [ownedCoverageSet, products]);

  const ownedBrands = useMemo(() => {
    const map = new Map<string, { brand: string; image: string; owned: number; total: number }>();
    for (const p of products) {
      const brand = 'Pop Mart';
      if (!map.has(brand)) map.set(brand, { brand, image: p.image, owned: 0, total: 0 });
      map.get(brand)!.total += 1;
    }
    for (const p of ownedProducts) {
      const brand = 'Pop Mart';
      if (!map.has(brand)) map.set(brand, { brand, image: p.image, owned: 0, total: 0 });
      map.get(brand)!.owned += 1;
    }
    // 只顯示「真的有擁有」的品牌
    return Array.from(map.values()).filter((x) => x.total > 0 && x.owned > 0);
  }, [ownedProducts, products]);

  const ownedIps = useMemo(() => {
    if (!collectionPath.brand) return [];
    const poolAll = products;
    const poolOwned = ownedProducts;
    const map = new Map<string, { ip: string; image: string; owned: number; total: number }>();
    for (const p of poolAll) {
      const ip = deriveBrandLabel(p.title);
      if (!ip || ip === 'Pop Mart') continue;
      if (!map.has(ip)) map.set(ip, { ip, image: p.image, owned: 0, total: 0 });
      map.get(ip)!.total += 1;
    }
    for (const p of poolOwned) {
      const ip = deriveBrandLabel(p.title);
      if (!ip || ip === 'Pop Mart') continue;
      if (!map.has(ip)) map.set(ip, { ip, image: p.image, owned: 0, total: 0 });
      map.get(ip)!.owned += 1;
    }
    // 只顯示「真的有擁有」的 IP
    return Array.from(map.values()).filter((x) => x.total > 0 && x.owned > 0);
  }, [collectionPath.brand, ownedProducts, products]);

  const ownedSeries = useMemo(() => {
    if (!collectionPath.ip) return [];
    const poolAll = products.filter((p) => deriveBrandLabel(p.title) === collectionPath.ip);
    const poolOwned = ownedProducts.filter((p) => deriveBrandLabel(p.title) === collectionPath.ip);
    const map = new Map<string, { series: string; image: string; owned: number; total: number }>();
    for (const p of poolAll) {
      const s = deriveSeriesName(p.title);
      if (!s) continue;
      if (!map.has(s)) map.set(s, { series: s, image: p.image, owned: 0, total: 0 });
      map.get(s)!.total += 1;
    }
    for (const p of poolOwned) {
      const s = deriveSeriesName(p.title);
      if (!s) continue;
      if (!map.has(s)) map.set(s, { series: s, image: p.image, owned: 0, total: 0 });
      map.get(s)!.owned += 1;
    }
    // 只顯示「真的有擁有」的系列
    return Array.from(map.values()).filter((x) => x.total > 0 && x.owned > 0);
  }, [collectionPath.ip, ownedProducts]);

  const ownedItemsInSeries = useMemo(() => {
    if (!collectionPath.ip || !collectionPath.series) return [];
    return ownedProducts.filter(
      (p) => deriveBrandLabel(p.title) === collectionPath.ip && deriveSeriesName(p.title) === collectionPath.series
    );
  }, [collectionPath.ip, collectionPath.series, ownedProducts]);

  const wishedProducts = useMemo(() => {
    const wishSet = new Set(wishIds);
    return products.filter((p) => wishSet.has(p.id));
  }, [products, wishIds]);

  const wishedSeries = useMemo(() => {
    // 系列層級願望清單 key：series:<ip>:<series>
    const seriesKeys = wishIds.filter((k) => k.startsWith('series:') && k.split(':').length >= 3);
    return seriesKeys
      .map((k) => {
        const rest = k.slice('series:'.length);
        const idx = rest.indexOf(':');
        if (idx <= 0) return null;
        const ip = rest.slice(0, idx);
        const series = rest.slice(idx + 1);
        const hero = products.find((p) => deriveBrandLabel(p.title) === ip && deriveSeriesName(p.title) === series)?.image;
        return {
          key: k,
          ip,
          series,
          image: hero ?? products.find((p) => deriveBrandLabel(p.title) === ip)?.image ?? products[0]?.image,
          to: `/subseries?ip=${encodeURIComponent(ip)}&name=${encodeURIComponent(series)}`,
        };
      })
      .filter(Boolean) as Array<{ key: string; ip: string; series: string; image?: string; to: string }>;
  }, [deriveSeriesName, products, wishIds]);

  const wishlistItems = useMemo(
    () =>
      products.slice(8, 16).map((p, idx) => ({
        title: p.title,
        brand: deriveBrandLabel(p.title),
        price: p.price || '—',
        image: p.image,
        hasListing: idx % 3 !== 2,
      })),
    [products]
  );

  const catalogProgress = useMemo(
    () =>
      products.slice(16, 24).map((p, idx) => {
        const total = 12;
        const done = Math.max(1, (idx * 3 + 5) % (total + 1));
        const percent = Math.round((done / total) * 100);
        return {
          title: p.title,
          progress: `${done} / ${total}`,
          percent,
          image: p.image,
          isCompleted: percent >= 100,
        };
      }),
    [products]
  );

  return (
    <div className="animate-in fade-in duration-500">
      <TopBar title="探索" rightElement={<></>} />

      <div className="pt-20 px-container-margin max-w-screen-md mx-auto">
        <header className="mb-3">
          <div className="grid grid-cols-2 p-1 bg-white rounded-xl relative border border-black/[0.08] shadow-sm">
            <button 
              onClick={() => setActiveTab('gallery')}
              className={cn(
                "relative z-10 py-2.5 text-sm font-medium rounded-lg transition-all",
                activeTab === 'gallery'
                  ? "text-on-surface bg-[#f0f0f0] shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              )}
            >
              圖鑑
            </button>
            <button 
              onClick={() => setActiveTab('collection')}
              className={cn(
                "relative z-10 py-2.5 text-sm font-medium rounded-lg transition-all",
                activeTab === 'collection'
                  ? "text-on-surface bg-[#f0f0f0] shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              )}
            >
              我的收藏
            </button>
          </div>

          {activeTab === 'collection' && (
            <div className="flex gap-3 mt-4 flex-wrap">
               {(['catalog', 'wishlist'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setSubTab(tab as 'catalog' | 'single' | 'wishlist')}
                  className={cn(
                    "px-4 py-1.5 text-xs font-semibold rounded-full border transition-all",
                    subTab === tab
                      ? "text-on-surface bg-white border-black/[0.12] shadow-sm"
                      : "text-on-surface-variant border-transparent hover:text-on-surface"
                  )}
                >
                  {tab === 'catalog' ? '收藏冊' : '願望清單'}
                </button>
              ))}
            </div>
          )}
        </header>

        {activeTab === 'gallery' ? (
          <>
            <section className="py-stack-lg">
              <form className="ui-search" onSubmit={(e) => e.preventDefault()}>
                <span className="material-symbols-outlined ui-search-icon">search</span>
                <input
                  value={catalogQuery}
                  onChange={(e) => setCatalogQuery(e.target.value)}
                  className="text-sm"
                  placeholder="搜尋品牌、系列或盲盒"
                  type="search"
                />
              </form>
            </section>

            <section className="space-y-4">
              <div className="flex items-end justify-between">
                <h3 className="text-xl font-bold text-secondary">品牌</h3>
                <p className="text-xs font-bold text-on-surface-variant">點卡片進入</p>
              </div>
              <div className="grid grid-cols-2 gap-grid-gutter">
                {brandCards.map((b) => (
                  <motion.button
                    key={b.id}
                    type="button"
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate(b.to)}
                    className="glass-card rounded-2xl overflow-hidden text-left"
                  >
                    <div className="relative aspect-[16/12] bg-neutral-100">
                      {b.image && (
                        <img className="w-full h-full object-cover" src={b.image} referrerPolicy="no-referrer" alt="" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/10 to-transparent" />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleOwned(b.ownedKey);
                        }}
                        className="absolute top-2 right-2 w-9 h-9 rounded-full bg-black/45 backdrop-blur-md flex items-center justify-center border border-white/15 active:scale-90 transition-transform"
                        aria-label="加入收藏冊"
                      >
                        <span
                          className="material-symbols-outlined text-white text-[20px]"
                          style={{ fontVariationSettings: isOwned(b.ownedKey) ? "'FILL' 1" : "'FILL' 0" }}
                        >
                          check_circle
                        </span>
                      </button>
                      <div className="absolute bottom-0 left-0 p-4">
                        <p className="text-white text-base font-extrabold">{b.title}</p>
                        <p className="text-white/80 text-[11px] font-semibold mt-1">Brand</p>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            </section>
          </>
        ) : subTab === 'wishlist' ? (
          <section className="mt-stack-md space-y-4">
            <div className="flex items-end justify-between">
              <h2 className="text-xl font-bold text-on-surface">願望清單</h2>
              <p className="text-xs font-bold text-on-surface-variant">{wishedProducts.length + wishedSeries.length} 件</p>
            </div>
            <div className="grid grid-cols-2 gap-grid-gutter">
              {wishedSeries.map((s) => (
                <motion.button
                  key={s.key}
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate(s.to)}
                  className="glass-card rounded-2xl overflow-hidden text-left"
                >
                  <div className="relative aspect-[16/12] bg-neutral-100">
                    {s.image && <img className="w-full h-full object-cover" src={s.image} referrerPolicy="no-referrer" alt="" />}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleWish(s.key);
                      }}
                      className="absolute top-2 right-2 w-9 h-9 rounded-full bg-black/45 backdrop-blur-md flex items-center justify-center border border-white/15 active:scale-90 transition-transform"
                      aria-label="從願望清單移除"
                    >
                      <span className="material-symbols-outlined text-white text-[20px]">close</span>
                    </button>
                  </div>
                  <div className="p-4 space-y-2">
                    <p className="text-xs font-semibold text-primary">{s.ip}</p>
                    <p className="text-sm font-bold text-on-surface line-clamp-2 leading-snug">{s.series}</p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                      className="bg-white border border-black/[0.1] px-3 py-1 rounded-full text-[10px] font-bold text-on-surface-variant"
                    >
                      設定提醒
                    </button>
                  </div>
                </motion.button>
              ))}
              {wishedProducts.map((p) => (
                <motion.button
                  key={p.id}
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate(`/product/${p.id}?src=catalog`)}
                  className="glass-card rounded-2xl overflow-hidden text-left"
                >
                  <div className="relative aspect-[16/12] bg-neutral-100">
                    <img className="w-full h-full object-cover" src={p.image} referrerPolicy="no-referrer" alt="" />
                    {/* 願望清單卡片：移除愛心 icon */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleWish(p.id);
                      }}
                      className="absolute top-2 right-2 w-9 h-9 rounded-full bg-black/45 backdrop-blur-md flex items-center justify-center border border-white/15 active:scale-90 transition-transform"
                      aria-label="從願望清單移除"
                    >
                      <span className="material-symbols-outlined text-white text-[20px]">close</span>
                    </button>
                  </div>
                  <div className="p-4 space-y-2">
                    <p className="text-xs font-semibold text-primary">{deriveBrandLabel(p.title)}</p>
                    <p className="text-sm font-bold text-on-surface line-clamp-2 leading-snug">{p.title}</p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                      className="bg-white border border-black/[0.1] px-3 py-1 rounded-full text-[10px] font-bold text-on-surface-variant"
                    >
                      設定提醒
                    </button>
                  </div>
                </motion.button>
              ))}

              {wishedProducts.length + wishedSeries.length === 0 && (
                <div className="col-span-2 text-center py-10 text-sm text-on-surface-variant">
                  還沒有加入願望清單的商品。
                </div>
              )}
            </div>
          </section>
        ) : (
          <section className="mt-stack-md space-y-4">
            <div className="flex items-end justify-between">
              <div className="flex items-center gap-2">
                {(collectionPath.series || collectionPath.ip || collectionPath.brand) && (
                  <button
                    type="button"
                    onClick={() =>
                      setCollectionPath((p) =>
                        p.series ? { brand: p.brand, ip: p.ip } : p.ip ? { brand: p.brand } : {}
                      )
                    }
                    className="text-on-surface-variant hover:text-on-surface transition-colors"
                    aria-label="返回"
                  >
                    <span className="material-symbols-outlined">arrow_back</span>
                  </button>
                )}
                <h2 className="text-xl font-bold text-on-surface">
                  {collectionPath.series
                    ? '商品'
                    : collectionPath.ip
                      ? '系列'
                      : collectionPath.brand
                        ? 'IP'
                        : '品牌'}
                </h2>
              </div>
              <p className="text-xs font-bold text-on-surface-variant">{ownedProducts.length} 件</p>
            </div>

            {!collectionPath.brand && (
              <div className="grid grid-cols-2 gap-grid-gutter">
                {ownedBrands.map((b) => {
                  const pct = b.total ? Math.round((b.owned / b.total) * 100) : 0;
                  return (
                    <motion.button
                      key={b.brand}
                      type="button"
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setCollectionPath({ brand: b.brand })}
                      className="glass-card rounded-2xl overflow-hidden text-left"
                    >
                      <div className="relative aspect-[16/12] bg-neutral-100">
                        <img className="w-full h-full object-cover" src={b.image} referrerPolicy="no-referrer" alt="" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/10 to-transparent" />
                      </div>
                      <div className="p-4 space-y-2">
                        <p className="text-sm font-bold text-on-surface">{b.brand}</p>
                        <div className="flex items-center justify-between text-[11px] text-on-surface-variant font-semibold">
                          <span>{b.owned}/{b.total}</span>
                          <span>{pct}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-black/[0.06] rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-primary to-tertiary-fixed" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
                {ownedBrands.length === 0 && (
                  <div className="col-span-2 text-center py-10 text-sm text-on-surface-variant">
                    還沒有加入收藏冊的單品。
                  </div>
                )}
              </div>
            )}

            {collectionPath.brand && !collectionPath.ip && (
              <div className="grid grid-cols-2 gap-grid-gutter">
                {ownedIps.map((x) => {
                  const pct = x.total ? Math.round((x.owned / x.total) * 100) : 0;
                  return (
                    <motion.button
                      key={x.ip}
                      type="button"
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setCollectionPath({ brand: collectionPath.brand, ip: x.ip })}
                      className="glass-card rounded-2xl overflow-hidden text-left"
                    >
                      <div className="relative aspect-square bg-neutral-100">
                        <img className="w-full h-full object-cover" src={x.image} referrerPolicy="no-referrer" alt="" />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleOwned(`series:${x.ip}`);
                          }}
                          className="absolute top-2 right-2 w-9 h-9 rounded-full bg-black/45 backdrop-blur-md flex items-center justify-center border border-white/15 active:scale-90 transition-transform"
                          aria-label="加入收藏冊"
                        >
                          <span
                            className="material-symbols-outlined text-white text-[20px]"
                            style={{ fontVariationSettings: isOwned(`series:${x.ip}`) ? "'FILL' 1" : "'FILL' 0" }}
                          >
                            check_circle
                          </span>
                        </button>
                      </div>
                      <div className="p-4 space-y-2">
                        <p className="text-sm font-bold text-on-surface">{x.ip}</p>
                        <div className="flex items-center justify-between text-[11px] text-on-surface-variant font-semibold">
                          <span>{x.owned}/{x.total}</span>
                          <span>{pct}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-black/[0.06] rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-primary to-tertiary-fixed" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
                {ownedIps.length === 0 && (
                  <div className="col-span-2 text-center py-10 text-sm text-on-surface-variant">
                    目前沒有可顯示的 IP。
                  </div>
                )}
              </div>
            )}

            {collectionPath.ip && !collectionPath.series && (
              <div className="grid grid-cols-2 gap-grid-gutter">
                {ownedSeries.map((x) => {
                  const pct = x.total ? Math.round((x.owned / x.total) * 100) : 0;
                  return (
                    <motion.button
                      key={x.series}
                      type="button"
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setCollectionPath({ brand: collectionPath.brand, ip: collectionPath.ip, series: x.series })}
                      className="glass-card rounded-2xl overflow-hidden text-left"
                    >
                      <div className="relative aspect-square bg-neutral-100">
                        <img className="w-full h-full object-cover" src={x.image} referrerPolicy="no-referrer" alt="" />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleOwned(`subseries:${collectionPath.ip}:${x.series}`);
                          }}
                          className="absolute top-2 right-2 w-9 h-9 rounded-full bg-black/45 backdrop-blur-md flex items-center justify-center border border-white/15 active:scale-90 transition-transform"
                          aria-label="加入收藏冊"
                        >
                          <span
                            className="material-symbols-outlined text-white text-[20px]"
                            style={{ fontVariationSettings: isOwned(`subseries:${collectionPath.ip}:${x.series}`) ? "'FILL' 1" : "'FILL' 0" }}
                          >
                            check_circle
                          </span>
                        </button>
                      </div>
                      <div className="p-4 space-y-2">
                        <p className="text-sm font-bold text-on-surface line-clamp-2 leading-snug">{x.series}</p>
                        <div className="flex items-center justify-between text-[11px] text-on-surface-variant font-semibold">
                          <span>{x.owned}/{x.total}</span>
                          <span>{pct}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-black/[0.06] rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-primary to-tertiary-fixed" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
                {ownedSeries.length === 0 && (
                  <div className="col-span-2 text-center py-10 text-sm text-on-surface-variant">
                    目前沒有可顯示的系列。
                  </div>
                )}
              </div>
            )}

            {collectionPath.series && (
              <div className="grid grid-cols-2 gap-grid-gutter">
                {ownedItemsInSeries.map((p) => (
                  <motion.button
                    key={p.id}
                    type="button"
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate(`/product/${p.id}?src=catalog`)}
                    className="glass-card rounded-2xl overflow-hidden text-left"
                  >
                    <div className="relative aspect-square bg-neutral-100">
                      <img className="w-full h-full object-cover" src={p.image} referrerPolicy="no-referrer" alt="" />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleOwned(p.id);
                        }}
                        className="absolute top-2 right-2 w-9 h-9 rounded-full bg-black/45 backdrop-blur-md flex items-center justify-center border border-white/15 active:scale-90 transition-transform"
                        aria-label="從收藏冊移除"
                      >
                        <span
                          className="material-symbols-outlined text-white text-[20px]"
                          style={{ fontVariationSettings: isOwned(p.id) ? "'FILL' 1" : "'FILL' 0" }}
                        >
                          check_circle
                        </span>
                      </button>
                    </div>
                    <div className="p-3">
                      <p className="text-[10px] font-semibold text-primary mb-0.5">{deriveBrandLabel(p.title)}</p>
                      <p className="text-xs font-bold text-on-surface line-clamp-2 leading-snug">{p.title}</p>
                    </div>
                  </motion.button>
                ))}
                {ownedItemsInSeries.length === 0 && (
                  <div className="col-span-2 text-center py-10 text-sm text-on-surface-variant">
                    這個系列目前沒有擁有的單品。
                  </div>
                )}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
