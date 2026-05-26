import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import TopBar from '@/frontend/presentation/components/TopBar';
import { useAppState } from '@/frontend/presentation/providers/AppStateProvider';
import { useCatalogProducts } from '@/frontend/presentation/hooks/useCatalog';
import type { Listing } from '@/frontend/domain/entities/listing';
import { cn } from '@/frontend/shared/utils/cn';
import { APP_PAGE_CLASS } from '@/frontend/presentation/constants/layout';

type ShopMode = 'buy' | 'unbox' | 'swap';

const MODE_TABS: { key: ShopMode; label: string }[] = [
  { key: 'buy', label: '買' },
  { key: 'unbox', label: '拆' },
  { key: 'swap', label: '換' },
];

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
  const { listings, posts } = useAppState();
  const { products } = useCatalogProducts();
  const [mode, setMode] = useState<ShopMode>('buy');

  const shopItems = useMemo(() => {
    const map = new Map<string, Listing>();
    for (const item of [...listings, ...posts]) map.set(item.id, item);
    const fromListings = Array.from(map.values());
    if (fromListings.length > 0) return fromListings;

    return products.map((p, idx) => ({
      id: `shop_${p.id}`,
      title: p.title,
      itemName: p.title,
      price: p.price || 'HK$ 0.00',
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

  const filteredItems = useMemo(
    () => shopItems.filter((item) => listingMatchesMode(item, mode)),
    [shopItems, mode]
  );

  return (
    <div className={cn(APP_PAGE_CLASS, 'animate-in fade-in duration-500')}>
      <TopBar title="商城" />

      <div className="pt-topbar px-container-margin pb-6">
        <div className="py-stack-lg">
          <div className="flex gap-1.5 rounded-full border-2 border-outline bg-white p-1 shadow-[3px_3px_0_#111]">
            {MODE_TABS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setMode(key)}
                className={cn(
                  'flex-1 rounded-full py-2.5 text-sm font-extrabold transition-all',
                  mode === key
                    ? 'bg-secondary text-on-secondary shadow-[2px_2px_0_#111]'
                    : 'text-on-surface-variant hover:text-on-background'
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <p className="py-16 text-center text-sm text-on-surface-variant">此類型暫無商品</p>
        ) : (
          <div className="grid grid-cols-2 gap-grid-gutter">
            {filteredItems.map((item) => (
              <motion.button
                key={item.id}
                type="button"
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  if (item.isSeeded) {
                    const productId = item.id.replace(/^pm_/, '').replace(/^shop_/, '');
                    navigate(`/product/${productId}`);
                    return;
                  }
                  navigate(`/listing/${item.id}`);
                }}
                className="glass-card rounded-2xl overflow-hidden flex flex-col text-left"
              >
                <div className="relative aspect-square">
                  <img
                    className="h-full w-full object-cover"
                    src={item.image}
                    alt={item.title}
                    referrerPolicy="no-referrer"
                  />
                  <span className="absolute top-2 left-2 rounded-full border border-outline bg-white/90 px-2 py-0.5 text-[10px] font-bold text-on-background">
                    {modeBadge(mode)}
                  </span>
                </div>
                <div className="p-3">
                  <h3 className="mb-1 line-clamp-2 text-sm font-semibold leading-snug text-on-surface">
                    {item.title}
                  </h3>
                  <p className="text-primary font-bold">{item.price}</p>
                  <p className="mt-1 truncate text-[10px] text-on-surface-variant">{item.tradeMode}</p>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
