import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { navigateWithReturn } from '@/frontend/shared/utils/routeNavigation';
import TopBar from '@/frontend/presentation/components/TopBar';
import ListingCardImage from '@/frontend/presentation/components/ListingCardImage';
import { useAppState } from '@/frontend/presentation/providers/AppStateProvider';
import type { Listing } from '@/frontend/domain/entities/listing';
import { listingTradeKind, type ListingTradeKind } from '@/frontend/shared/utils/tradeMode';
import { cn } from '@/frontend/shared/utils/cn';

const CART_TABS: { key: ListingTradeKind; label: string }[] = [
  { key: 'sell', label: '販售' },
  { key: 'split', label: '拆盒團' },
  { key: 'swap', label: '交換' },
];

const TAB_HINTS: Record<ListingTradeKind, string> = {
  sell: '勾選商品後可一次下單。',
  split: '點擊貼文前往認領申請，完成拆盒團流程。',
  swap: '點擊貼文填寫交換申請表單。',
};

function itemPriceNumber(item: Listing): number {
  const n = Number(item.price.replace(/[^\d.]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function SellCartItemRow({
  item,
  selected,
  onToggle,
  onRemove,
  onOpen,
}: {
  item: Listing;
  selected: boolean;
  onToggle: () => void;
  onRemove: () => void;
  onOpen: () => void;
}) {
  return (
    <div className="rounded-2xl border-2 border-outline bg-white shadow-none p-3 flex gap-3">
      <label className="pt-1">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          className="h-4 w-4 accent-black"
          aria-label={`選擇 ${item.title}`}
        />
      </label>
      <ListingCardImage src={item.image} alt={item.title} className="w-20 h-20 rounded-xl" />
      <div className="flex-1 min-w-0">
        <p className="card-title-2 text-sm font-bold leading-snug text-on-surface">{item.title}</p>
        <p className="text-sm font-black text-primary mt-1">{item.price || '—'}</p>
        <div className="flex gap-2 mt-2">
          <button
            type="button"
            onClick={onOpen}
            className="text-xs px-3 py-1 rounded-full border border-black/[0.12]"
          >
            查看
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="text-xs px-3 py-1 rounded-full border border-black/[0.12] text-on-surface-variant"
          >
            移除
          </button>
        </div>
      </div>
    </div>
  );
}

function IntentCartItemRow({
  item,
  kind,
  onRemove,
  onProceed,
}: {
  item: Listing;
  kind: 'split' | 'swap';
  onRemove: () => void;
  onProceed: () => void;
}) {
  const priceLabel = kind === 'swap' ? '可交換' : item.price || '拆盒團';
  const proceedLabel = kind === 'split' ? '前往認領' : '前往申請交換';

  return (
    <div className="rounded-2xl border-2 border-outline bg-white shadow-none p-3 flex gap-3">
      <ListingCardImage src={item.image} alt={item.title} className="w-20 h-20 rounded-xl" />
      <div className="flex-1 min-w-0">
        <p className="card-title-2 text-sm font-bold leading-snug text-on-surface">{item.title}</p>
        <p className="text-sm font-black text-primary mt-1">{priceLabel}</p>
        <div className="flex flex-wrap gap-2 mt-2">
          <button
            type="button"
            onClick={onProceed}
            className="text-xs px-3 py-1.5 rounded-full border-2 border-black bg-black font-bold text-white"
          >
            {proceedLabel}
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="text-xs px-3 py-1 rounded-full border border-black/[0.12] text-on-surface-variant"
          >
            移除
          </button>
        </div>
      </div>
    </div>
  );
}

function isCartTab(raw: string | null): raw is ListingTradeKind {
  return raw === 'sell' || raw === 'split' || raw === 'swap';
}

export default function CartPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const { cartItems, removeFromCart } = useAppState();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const itemsByKind = useMemo(() => {
    const map: Record<ListingTradeKind, Listing[]> = { sell: [], split: [], swap: [] };
    for (const item of cartItems) {
      map[listingTradeKind(item)].push(item);
    }
    return map;
  }, [cartItems]);

  const activeTab: ListingTradeKind = useMemo(() => {
    if (isCartTab(tabParam)) return tabParam;
    const firstWithItems = CART_TABS.find((t) => itemsByKind[t.key].length > 0);
    return firstWithItems?.key ?? 'sell';
  }, [tabParam, itemsByKind]);

  const sellItems = itemsByKind.sell;
  const activeItems = itemsByKind[activeTab];

  const selectedSellItems = sellItems.filter((item) => selectedIds.includes(item.id));
  const selectedSellTotal = selectedSellItems.reduce((sum, item) => sum + itemPriceNumber(item), 0);

  const setActiveTab = (tab: ListingTradeKind) => {
    setSearchParams(tab === 'sell' ? {} : { tab });
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAllSell = () => {
    const sellIds = sellItems.map((i) => i.id);
    const allSelected = sellIds.length > 0 && sellIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !sellIds.includes(id)));
    } else {
      setSelectedIds((prev) => [...new Set([...prev, ...sellIds])]);
    }
  };

  useEffect(() => {
    const sellIdSet = new Set(sellItems.map((item) => item.id));
    setSelectedIds((prev) => prev.filter((id) => sellIdSet.has(id)));
  }, [sellItems]);

  const handlePlaceOrder = () => {
    if (selectedSellItems.length === 0) return;
    navigate(`/checkout?ids=${selectedSellItems.map((i) => i.id).join(',')}`);
  };

  const openSplitProceed = (item: Listing) => {
    if (item.splitBoxGroupId) {
      const params = new URLSearchParams();
      if (item.splitBoxSlotId) params.set('slotId', item.splitBoxSlotId);
      params.set('listingId', item.id);
      navigateWithReturn(
        navigate,
        `/split-box/${item.splitBoxGroupId}/apply?${params.toString()}`,
        location
      );
      return;
    }
    navigate(`/listing/${item.id}`);
  };

  const tabCount = (kind: ListingTradeKind) => itemsByKind[kind].length;

  return (
    <div className="animate-in fade-in duration-500 pb-28">
      <TopBar showBack title="購物車" />

      <main className="pt-topbar-content px-5 w-full min-w-0 max-w-full">
        {cartItems.length === 0 ? (
          <p className="text-sm text-on-surface-variant text-center py-20">購物車目前是空的。</p>
        ) : (
          <>
            <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar pb-1">
              {CART_TABS.map((tab) => {
                const count = tabCount(tab.key);
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={cn(
                      'flex shrink-0 items-center gap-1.5 px-5 py-2 rounded-full font-bold text-xs whitespace-nowrap transition-all active:scale-95',
                      activeTab === tab.key
                        ? 'doodle-press premium-gradient text-white'
                        : 'glass-card text-on-surface-variant'
                    )}
                  >
                    {tab.label}
                    {count > 0 ? (
                      <span
                        className={cn(
                          'min-w-[1.25rem] rounded-full px-1.5 py-0.5 text-[10px] font-extrabold leading-none',
                          activeTab === tab.key ? 'bg-white/25 text-white' : 'bg-black/[0.06] text-on-surface'
                        )}
                      >
                        {count}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            <p className="mb-4 text-[11px] leading-relaxed text-on-surface-variant">{TAB_HINTS[activeTab]}</p>

            {activeItems.length === 0 ? (
              <p className="py-16 text-center text-sm text-on-surface-variant">
                此分類尚無商品，可切換其他分頁查看。
              </p>
            ) : (
              <div className="space-y-3">
                {activeTab === 'sell' ? (
                  <>
                    <div className="rounded-2xl border-2 border-outline bg-white shadow-none p-3 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={toggleSelectAllSell}
                        className="text-xs px-3 py-1 rounded-full border border-black/[0.12]"
                      >
                        {selectedSellItems.length === sellItems.length && sellItems.length > 0
                          ? '取消全選'
                          : '全選'}
                      </button>
                      <p className="text-xs text-on-surface-variant">
                        已選 {selectedSellItems.length} / {sellItems.length} 件
                      </p>
                    </div>
                    {sellItems.map((item) => (
                      <SellCartItemRow
                        key={item.id}
                        item={item}
                        selected={selectedIds.includes(item.id)}
                        onToggle={() => toggleSelected(item.id)}
                        onRemove={() => removeFromCart(item.id)}
                        onOpen={() => navigate(`/listing/${item.id}`)}
                      />
                    ))}
                  </>
                ) : (
                  activeItems.map((item) => (
                    <IntentCartItemRow
                      key={item.id}
                      item={item}
                      kind={activeTab}
                      onRemove={() => removeFromCart(item.id)}
                      onProceed={() =>
                        activeTab === 'split'
                          ? openSplitProceed(item)
                          : navigate(`/listing/${item.id}`)
                      }
                    />
                  ))
                )}
              </div>
            )}

            {activeTab === 'sell' && sellItems.length > 0 ? (
              <section className="mt-6 rounded-2xl border-2 border-outline bg-white shadow-none p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-on-surface-variant">已選商品小計</span>
                  <span className="font-bold text-on-surface">
                    NT$ {selectedSellTotal.toLocaleString()}
                  </span>
                </div>
                <button
                  type="button"
                  disabled={selectedSellItems.length === 0}
                  onClick={handlePlaceOrder}
                  className="w-full py-3 rounded-full border-2 border-outline bg-primary text-on-primary font-bold text-sm shadow-none disabled:opacity-60"
                >
                  下單
                  {selectedSellItems.length > 0 ? `（${selectedSellItems.length} 件）` : ''}
                </button>
              </section>
            ) : null}
          </>
        )}
      </main>
    </div>
  );
}
