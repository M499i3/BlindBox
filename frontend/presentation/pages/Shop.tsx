import React, { useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import TopBar from '@/frontend/presentation/components/TopBar';
import { useProductCollection } from '@/frontend/presentation/hooks/useProductCollection';
import { useAppState } from '@/frontend/presentation/providers/AppStateProvider';
import { useCatalogProducts } from '@/frontend/presentation/hooks/useCatalog';
import type { Listing } from '@/frontend/domain/entities/listing';
import { cn } from '@/frontend/shared/utils/cn';
import { filterListingsByFuzzyQuery } from '@/frontend/shared/utils/searchListings';
import { APP_PAGE_CLASS } from '@/frontend/presentation/constants/layout';

type ShopMode = 'buy' | 'unbox' | 'swap';

const SHOP_SCROLL_KEY = 'shop:listScroll';

function parseShopMode(raw: string | null): ShopMode {
  if (raw === 'buy' || raw === 'unbox' || raw === 'swap') return raw;
  return 'buy';
}

function getAppScrollEl(): HTMLElement | null {
  return document.querySelector<HTMLElement>('.app-scroll');
}

function saveShopScroll() {
  const el = getAppScrollEl();
  if (el) sessionStorage.setItem(SHOP_SCROLL_KEY, String(el.scrollTop));
}

function restoreShopScroll() {
  const raw = sessionStorage.getItem(SHOP_SCROLL_KEY);
  if (raw == null) return;
  const top = Number(raw);
  if (!Number.isFinite(top)) return;
  const el = getAppScrollEl();
  if (!el) return;
  requestAnimationFrame(() => {
    el.scrollTop = top;
    sessionStorage.removeItem(SHOP_SCROLL_KEY);
  });
}

const MODE_TABS: { key: ShopMode; label: string }[] = [
  { key: 'buy', label: '買' },
  { key: 'unbox', label: '拆' },
  { key: 'swap', label: '換' },
];

const MODE_MEDIA: Record<ShopMode, { label: string; src: string; alt: string }> = {
  buy: { label: '買', src: '/Teddy%20Bear.svg?v=2', alt: 'Teddy Bear' },
  unbox: { label: '拆', src: '/split-box.svg?v=2', alt: 'split box' },
  swap: { label: '換', src: '/exchange-box.svg?v=2', alt: 'exchange box' },
};

function listingMatchesMode(item: Listing, mode: ShopMode): boolean {
  const tm = item.tradeMode ?? '';
  const cond = item.condition ?? '';
  if (mode === 'swap') return item.allowSwap || tm.includes('換');
  if (mode === 'unbox') return tm.includes('拆') || cond.includes('拆');
  return tm.includes('賣') || tm.includes('買') || (!tm.includes('換') && !tm.includes('拆'));
}

function modeBadge(mode: ShopMode): string {
  if (mode === 'buy') return '可購買';
  if (mode === 'unbox') return '可拆盒';
  return '可交換';
}

export default function Shop() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { listings, posts, addToCart, isInCart } = useAppState();
  const {
    toggleWishFromListing,
    toggleOwnedFromListing,
    isListingWished,
    isListingOwned,
  } = useProductCollection();
  const { products } = useCatalogProducts();
  const mode = parseShopMode(searchParams.get('mode'));
  const query = searchParams.get('q') ?? '';

  const setMode = (next: ShopMode) => {
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        p.set('mode', next);
        return p;
      },
      { replace: true }
    );
  };

  const setQuery = (next: string) => {
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        const trimmed = next.trim();
        if (trimmed) p.set('q', trimmed);
        else p.delete('q');
        return p;
      },
      { replace: true }
    );
  };

  useEffect(() => {
    restoreShopScroll();
  }, []);

  const shopItems = useMemo(() => {
    const map = new Map<string, Listing>();
    for (const item of [...listings, ...posts]) map.set(item.id, item);
    const fromListings = Array.from(map.values());
    if (fromListings.length > 0) return fromListings;

    return products.map((p, idx) => ({
      id: `pm_${p.id}`,
      title: p.title,
      itemName: p.title,
      price: p.price || 'NT$0',
      description: '',
      brand: 'Pop Mart',
      series: '',
      condition: idx % 3 === 1 ? '可拆盒' : '全新未拆',
      tradeMode: idx % 3 === 0 ? '我想換' : idx % 3 === 1 ? '我要拆' : '我要賣',
      shipping: '7-11 店到店',
      allowSwap: idx % 3 === 0,
      allowBargain: false,
      image: p.image,
      createdAt: new Date().toISOString(),
      sellerName: 'Blindy',
      isSeeded: true,
    }));
  }, [listings, posts, products]);

  const filteredItems = useMemo(() => {
    const byMode = shopItems.filter((item) => listingMatchesMode(item, mode));
    return filterListingsByFuzzyQuery(byMode, query);
  }, [shopItems, mode, query]);

  return (
    <div className={cn(APP_PAGE_CLASS, 'animate-in fade-in duration-500')}>
      <TopBar title="商城" />

      <div className="pt-topbar-content px-container-margin pb-6">
        <section className="pt-0 pb-stack-lg">
          <form
            className="ui-search"
            onSubmit={(e) => {
              e.preventDefault();
              const q = query.trim();
              if (q) navigate(`/search?q=${encodeURIComponent(q)}`);
            }}
          >
            <span className="material-symbols-outlined ui-search-icon">search</span>
            <input
              name="q"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="text-sm"
              placeholder="搜尋商城商品、品牌或系列"
              type="search"
            />
          </form>
        </section>

        <div className="pt-0 pb-stack-lg">
          <div className="flex justify-around gap-2">
            {MODE_TABS.map(({ key }) => {
              const meta = MODE_MEDIA[key];
              const active = mode === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setMode(key)}
                  aria-pressed={active}
                  aria-label={`篩選：${meta.label}`}
                  className="flex flex-1 flex-col items-center gap-1.5 border-0 bg-transparent p-2 shadow-none outline-none"
                >
                  <span className="flex h-32 w-full items-center justify-center">
                    <img
                      src={meta.src}
                      alt=""
                      className={cn(
                        'object-contain transition-[width,height,opacity] duration-200',
                        key === 'unbox' && 'translate-y-0.5',
                        active
                          ? key === 'unbox'
                            ? 'h-32 w-32 opacity-100'
                            : 'h-28 w-28 opacity-100'
                          : key === 'unbox'
                            ? 'h-24 w-24 opacity-50'
                            : 'h-20 w-20 opacity-50'
                      )}
                      decoding="async"
                    />
                  </span>
                  <span
                    className={cn(
                      'text-base font-black leading-none transition-colors',
                      active ? 'text-on-background' : 'text-on-surface-variant'
                    )}
                  >
                    {meta.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <p className="py-16 text-center text-sm text-on-surface-variant">
            {query.trim() ? '找不到符合的商品' : '此類型暫無商品'}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-grid-gutter">
            {filteredItems.map((item) => (
              <motion.div
                key={item.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  saveShopScroll();
                  const shopReturn = query.trim()
                    ? `/shop?mode=${mode}&q=${encodeURIComponent(query.trim())}`
                    : `/shop?mode=${mode}`;
                  if (item.isSeeded) {
                    const productId = item.id.replace(/^pm_/, '').replace(/^shop_/, '');
                    navigate(`/product/${productId}`, { state: { from: shopReturn } });
                    return;
                  }
                  navigate(`/listing/${item.id}`, { state: { from: shopReturn } });
                }}
                className="glass-card rounded-2xl overflow-hidden flex flex-col cursor-pointer"
              >
                <div className="relative aspect-square">
                  <img
                    className="h-full w-full object-cover"
                    src={item.image}
                    alt={item.title}
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-2 right-2 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleWishFromListing(item);
                      }}
                      className="w-9 h-9 rounded-full bg-black/45 backdrop-blur-md flex items-center justify-center border border-white/15 active:scale-90 transition-transform"
                      aria-label={isListingWished(item) ? '從想要移除' : '加入想要'}
                    >
                      <span
                        className="material-symbols-outlined text-white text-[20px]"
                        style={{ fontVariationSettings: isListingWished(item) ? "'FILL' 1" : "'FILL' 0" }}
                      >
                        favorite
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleOwnedFromListing(item);
                      }}
                      className="w-9 h-9 rounded-full bg-black/45 backdrop-blur-md flex items-center justify-center border border-white/15 active:scale-90 transition-transform"
                      aria-label={isListingOwned(item) ? '從收藏冊移除' : '加入收藏冊'}
                    >
                      <span
                        className="material-symbols-outlined text-white text-[20px]"
                        style={{ fontVariationSettings: isListingOwned(item) ? "'FILL' 1" : "'FILL' 0" }}
                      >
                        check_circle
                      </span>
                    </button>
                  </div>
                </div>
                <div className="p-3">
                  <div className="mb-2 flex gap-2">
                    <span
                      className={cn(
                        'rounded border px-2 py-0.5 text-[10px]',
                        mode === 'swap'
                          ? 'border-primary/50 text-primary'
                          : 'border-primary-fixed-dim text-primary-fixed-dim'
                      )}
                    >
                      {modeBadge(mode)}
                    </span>
                  </div>
                  <h3 className="mb-1 truncate text-sm font-semibold text-on-surface">{item.title}</h3>
                  <div className="flex items-center justify-between gap-2">
                    <p className="shrink-0 whitespace-nowrap font-bold text-primary">{item.price || '—'}</p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isInCart(item.id)) return;
                        if (!item.price) return;
                        addToCart(item.id);
                      }}
                      disabled={isInCart(item.id) || !item.price}
                      className={cn(
                        'h-11 min-w-11 shrink-0 rounded-full border-2 border-outline px-3 text-xs font-extrabold shadow-[3px_3px_0_#111] transition-transform active:translate-x-0.5 active:translate-y-0.5 active:shadow-none',
                        isInCart(item.id)
                          ? 'bg-secondary text-on-secondary opacity-90'
                          : !item.price
                            ? 'bg-black/[0.06] text-on-surface-variant opacity-80'
                            : 'bg-white text-on-background hover:bg-secondary/10'
                      )}
                      aria-label={isInCart(item.id) ? '已加入購物車' : '加入購物車'}
                    >
                      {isInCart(item.id) ? '已加入' : '加入購物車'}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
