import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import TopBar from '@/frontend/presentation/components/TopBar';
import ListingCardImage from '@/frontend/presentation/components/ListingCardImage';
import { useAppState } from '@/frontend/presentation/providers/AppStateProvider';
import type { Listing } from '@/frontend/domain/entities/listing';
import { isClaimableSplitBoxListing, listingTradeKind } from '@/frontend/shared/utils/tradeMode';
import { claimSplitBoxSlot } from '@/frontend/infrastructure/api/splitBoxApi';
import { invalidateCachesAfterSplitBoxClaim } from '@/frontend/shared/utils/cacheInvalidation';
import { cn } from '@/frontend/shared/utils/cn';

type CartTab = 'sell' | 'split' | 'swap';

const CART_TABS: { key: CartTab; label: string }[] = [
  { key: 'sell', label: '販售' },
  { key: 'split', label: '拆盒考慮' },
  { key: 'swap', label: '交換' },
];

const TAB_HINTS: Record<CartTab, string> = {
  sell: '勾選商品後可一次下單。',
  split: '這裡是你考慮認領的拆盒款式。勾選後點「確認認領」即完成認領；被別人搶先認領的款式可直接移除。',
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

function SplitCartItemRow({
  item,
  selected,
  claimable,
  claimed,
  claimError,
  onToggle,
  onRemove,
  onOpen,
}: {
  item: Listing;
  selected: boolean;
  claimable: boolean;
  claimed?: boolean;
  claimError?: string;
  onToggle: () => void;
  onRemove: () => void;
  onOpen: () => void;
}) {
  const takenByOthers = !claimable && !claimed;
  return (
    <div
      className={cn(
        'rounded-2xl border-2 bg-white shadow-none p-3 flex gap-3',
        claimed
          ? 'border-green-400 bg-green-50'
          : takenByOthers
            ? 'border-secondary/40 bg-secondary/5'
            : claimError
              ? 'border-secondary/50'
              : 'border-outline'
      )}
    >
      <label className="pt-1">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          disabled={!claimable || claimed}
          className="h-4 w-4 accent-black disabled:opacity-40"
          aria-label={`選擇 ${item.title}`}
        />
      </label>
      <ListingCardImage src={item.image} alt={item.title} className="w-20 h-20 rounded-xl" />
      <div className="flex-1 min-w-0">
        <p className="card-title-2 text-sm font-bold leading-snug text-on-surface">{item.title}</p>
        {claimed ? (
          <p className="text-xs font-bold text-green-600 mt-1">已成功認領 ✓</p>
        ) : takenByOthers ? (
          <p className="text-xs font-bold text-secondary mt-1">目前已被別人認領</p>
        ) : claimError ? (
          <p className="text-xs font-bold text-secondary mt-1">{claimError}</p>
        ) : (
          <p className="text-sm font-black text-primary mt-1">{item.price || '拆盒團'}</p>
        )}
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
  onRemove,
  onProceed,
}: {
  item: Listing;
  onRemove: () => void;
  onProceed: () => void;
}) {
  return (
    <div className="rounded-2xl border-2 border-outline bg-white shadow-none p-3 flex gap-3">
      <ListingCardImage src={item.image} alt={item.title} className="w-20 h-20 rounded-xl" />
      <div className="flex-1 min-w-0">
        <p className="card-title-2 text-sm font-bold leading-snug text-on-surface">{item.title}</p>
        <p className="text-sm font-black text-primary mt-1">可交換</p>
        <div className="flex flex-wrap gap-2 mt-2">
          <button
            type="button"
            onClick={onProceed}
            className="text-xs px-3 py-1.5 rounded-full border-2 border-black bg-black font-bold text-white"
          >
            前往申請交換
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

function isCartTab(raw: string | null): raw is CartTab {
  return raw === 'sell' || raw === 'split' || raw === 'swap';
}

export default function CartPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const { cartItems, removeFromCart, refreshUserData } = useAppState();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedSplitIds, setSelectedSplitIds] = useState<string[]>([]);
  const [claiming, setClaiming] = useState(false);
  const [claimSuccess, setClaimSuccess] = useState<Set<string>>(new Set());
  const [claimErrors, setClaimErrors] = useState<Record<string, string>>({});

  const itemsByKind = useMemo(() => {
    const map: Record<CartTab, Listing[]> = { sell: [], split: [], swap: [] };
    for (const item of cartItems) {
      const kind = listingTradeKind(item);
      map[kind].push(item);
    }
    return map;
  }, [cartItems]);

  const activeTab: CartTab = useMemo(() => {
    if (isCartTab(tabParam)) return tabParam;
    const firstWithItems = CART_TABS.find((t) => itemsByKind[t.key].length > 0);
    return firstWithItems?.key ?? 'sell';
  }, [tabParam, itemsByKind]);

  const sellItems = itemsByKind.sell;
  const splitItems = itemsByKind.split;
  const activeItems = itemsByKind[activeTab];

  const isSplitClaimable = (item: Listing) =>
    isClaimableSplitBoxListing(item) && !claimSuccess.has(item.id);

  const selectedSellItems = sellItems.filter((item) => selectedIds.includes(item.id));
  const selectedSellTotal = selectedSellItems.reduce((sum, item) => sum + itemPriceNumber(item), 0);

  const setActiveTab = (tab: CartTab) => {
    setSearchParams(tab === 'sell' ? {} : { tab }, { replace: true });
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

  useEffect(() => {
    const splitIdSet = new Set(splitItems.map((item) => item.id));
    setSelectedSplitIds((prev) => prev.filter((id) => splitIdSet.has(id)));
  }, [splitItems]);

  const toggleSelectedSplit = (id: string) => {
    setSelectedSplitIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const claimableSplitItems = splitItems.filter(isSplitClaimable);

  const toggleSelectAllSplit = () => {
    const ids = claimableSplitItems.map((i) => i.id);
    const allSelected = ids.length > 0 && ids.every((id) => selectedSplitIds.includes(id));
    if (allSelected) {
      setSelectedSplitIds((prev) => prev.filter((id) => !ids.includes(id)));
    } else {
      setSelectedSplitIds((prev) => [...new Set([...prev, ...ids])]);
    }
  };

  const handleConfirmClaim = async () => {
    const toClaim = splitItems.filter(
      (i) => selectedSplitIds.includes(i.id) && isSplitClaimable(i)
    );
    if (!toClaim.length || claiming) return;
    setClaiming(true);
    setClaimErrors({});
    const succeeded: string[] = [];
    const newErrors: Record<string, string> = {};

    for (const item of toClaim) {
      if (!item.splitBoxGroupId || !item.splitBoxSlotId) {
        newErrors[item.id] = '缺少拆盒團資訊';
        continue;
      }
      try {
        await claimSplitBoxSlot(item.splitBoxGroupId, item.splitBoxSlotId);
        succeeded.push(item.id);
      } catch (e) {
        newErrors[item.id] = e instanceof Error ? e.message : '認領失敗';
      }
    }

    if (succeeded.length > 0) {
      invalidateCachesAfterSplitBoxClaim();
      void refreshUserData();
    }
    setClaimSuccess((prev) => new Set([...prev, ...succeeded]));
    setClaimErrors(newErrors);
    setSelectedSplitIds((prev) => prev.filter((id) => !succeeded.includes(id)));
    setTimeout(() => {
      succeeded.forEach((id) => removeFromCart(id));
    }, 1800);
    setClaiming(false);
  };

  const handlePlaceOrder = () => {
    if (selectedSellItems.length === 0) return;
    navigate(`/checkout?ids=${selectedSellItems.map((i) => i.id).join(',')}`);
  };

  const tabCount = (kind: CartTab) => itemsByKind[kind].length;
  const visibleCartCount = sellItems.length + splitItems.length + itemsByKind.swap.length;
  const allClaimableSelected =
    claimableSplitItems.length > 0 &&
    claimableSplitItems.every((i) => selectedSplitIds.includes(i.id));

  return (
    <div className="animate-in fade-in duration-500 pb-28">
      <TopBar showBack title="購物車" />

      <main className="pt-topbar-content px-5 w-full min-w-0 max-w-full">
        {visibleCartCount === 0 ? (
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
                ) : activeTab === 'split' ? (
                  <>
                    <div className="rounded-2xl border-2 border-outline bg-white shadow-none p-3 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={toggleSelectAllSplit}
                        disabled={claimableSplitItems.length === 0}
                        className="text-xs px-3 py-1 rounded-full border border-black/[0.12] disabled:opacity-40"
                      >
                        {allClaimableSelected ? '取消全選' : '全選'}
                      </button>
                      <p className="text-xs text-on-surface-variant">
                        已選 {selectedSplitIds.length} / {claimableSplitItems.length} 件
                      </p>
                    </div>
                    {splitItems.map((item) => (
                      <SplitCartItemRow
                        key={item.id}
                        item={item}
                        selected={selectedSplitIds.includes(item.id)}
                        claimable={isSplitClaimable(item)}
                        claimed={claimSuccess.has(item.id)}
                        claimError={claimErrors[item.id]}
                        onToggle={() => toggleSelectedSplit(item.id)}
                        onRemove={() => removeFromCart(item.id)}
                        onOpen={() =>
                          item.splitBoxGroupId
                            ? navigate(`/split-box/${item.splitBoxGroupId}`)
                            : navigate(`/listing/${item.id}`)
                        }
                      />
                    ))}
                  </>
                ) : (
                  activeItems.map((item) => (
                    <IntentCartItemRow
                      key={item.id}
                      item={item}
                      onRemove={() => removeFromCart(item.id)}
                      onProceed={() => navigate(`/listing/${item.id}`)}
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

            {activeTab === 'split' && splitItems.length > 0 ? (
              <section className="mt-6 rounded-2xl border-2 border-outline bg-white shadow-none p-4 space-y-3">
                <button
                  type="button"
                  disabled={selectedSplitIds.length === 0 || claiming}
                  onClick={handleConfirmClaim}
                  className="w-full py-3 rounded-full border-2 border-outline bg-primary text-on-primary font-bold text-sm shadow-none disabled:opacity-60"
                >
                  {claiming
                    ? '認領中…'
                    : `確認認領${selectedSplitIds.length > 0 ? `（${selectedSplitIds.length} 件）` : ''}`}
                </button>
                <p className="text-center text-[10px] text-on-surface-variant">
                  送出認領僅代表有意加入，最終是否取得仍視拆盒團能否湊齊。
                </p>
              </section>
            ) : null}
          </>
        )}
      </main>
    </div>
  );
}
