import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import TopBar from '@/frontend/presentation/components/TopBar';
import ListingCardImage from '@/frontend/presentation/components/ListingCardImage';
import { LISTING_FIELD } from '@/frontend/presentation/components/listing/listingFormStyles';
import { createOrder } from '@/frontend/infrastructure/api/ordersApi';
import { getListing } from '@/frontend/infrastructure/api/listingsApi';
import type { Listing } from '@/frontend/domain/entities/listing';
import { useAppState } from '@/frontend/presentation/providers/AppStateProvider';
import { isMockDataEnabled } from '@/frontend/lib/popmartShowcase';
import { listingShippingOptions } from '@/frontend/shared/utils/listingShipping';
import { cn } from '@/frontend/shared/utils/cn';

function parsePrice(price: string): number {
  const n = Number(price.replace(/[^\d.]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function isSeededListingId(id: string): boolean {
  return id.startsWith('l_') || id.startsWith('pm_');
}

export default function CheckoutPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { posts, listings, removeFromCart } = useAppState();
  const mock = isMockDataEnabled();

  const listingIds = useMemo(() => {
    const single = params.get('listingId');
    if (single) return [single];
    const many = params.get('ids');
    if (!many) return [];
    return many.split(',').map((s) => s.trim()).filter(Boolean);
  }, [params]);

  const [items, setItems] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [shippingById, setShippingById] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const pool = useMemo(() => {
    const map = new Map<string, Listing>();
    for (const p of [...posts, ...listings]) map.set(p.id, p);
    return map;
  }, [posts, listings]);

  useEffect(() => {
    if (!listingIds.length) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const resolved: Listing[] = [];
      for (const id of listingIds) {
        const local = pool.get(id);
        if (local) {
          resolved.push(local);
          continue;
        }
        try {
          const remote = await getListing(id);
          if (!cancelled) resolved.push(remote);
        } catch {
          /* skip missing */
        }
      }
      if (!cancelled) {
        setItems(resolved);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [listingIds, pool]);

  useEffect(() => {
    setShippingById((prev) => {
      const next = { ...prev };
      for (const item of items) {
        if (!next[item.id]) {
          const opts = listingShippingOptions(item);
          next[item.id] = opts[0] ?? '7-11 店到店';
        }
      }
      return next;
    });
  }, [items]);

  const total = useMemo(
    () => items.reduce((sum, item) => sum + parsePrice(item.price), 0),
    [items]
  );

  const handleConfirm = async () => {
    if (!items.length || submitting) return;
    if (mock && items.some((item) => isSeededListingId(item.id))) {
      alert('示範商品無法結帳，請改用市集上的真實貼文');
      return;
    }
    setSubmitting(true);
    try {
      let lastChatId: string | null = null;
      for (const item of items) {
        const shipping = shippingById[item.id];
        const order = await createOrder(item.id, shipping);
        if (order.chatId) lastChatId = order.chatId;
        await removeFromCart(item.id);
      }
      if (items.length === 1 && lastChatId) {
        navigate(`/chat/${lastChatId}`);
      } else {
        navigate('/purchase-history');
      }
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : '結帳失敗，請稍後再試');
    } finally {
      setSubmitting(false);
    }
  };

  if (!listingIds.length) {
    return (
      <div className="pb-28">
        <TopBar showBack title="確認訂單" />
        <main className="px-5 pt-topbar-content text-center">
          <p className="text-sm text-on-surface-variant py-16">沒有可結帳的商品</p>
          <button
            type="button"
            onClick={() => navigate('/cart')}
            className="rounded-full border-2 border-outline px-6 py-3 text-sm font-bold"
          >
            返回購物車
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in pb-32 duration-500">
      <TopBar showBack title="確認訂單" />
      <main className="space-y-5 px-5 pt-topbar-content">
        {loading && <p className="text-sm text-on-surface-variant">載入訂單資料…</p>}
        {!loading && items.length === 0 && (
          <p className="text-sm text-on-surface-variant py-8 text-center">找不到商品，可能已下架</p>
        )}

        {items.map((item) => {
          const shippingOpts = listingShippingOptions(item);
          const selectedShipping = shippingById[item.id] ?? shippingOpts[0];
          return (
            <section
              key={item.id}
              className="space-y-4 rounded-2xl border-2 border-outline bg-white p-4 shadow-none"
            >
              <div className="flex gap-3">
                <ListingCardImage src={item.image} alt={item.title} className="h-20 w-20 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1">
                  <h2 className="card-title-2 text-sm font-bold leading-snug text-on-surface">{item.title}</h2>
                  <p className="mt-0.5 line-clamp-1 text-xs text-on-surface-variant">{item.itemName}</p>
                  <p className="mt-2 text-base font-black text-primary">{item.price}</p>
                </div>
              </div>
              <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                <div>
                  <dt className="text-on-surface-variant">品牌</dt>
                  <dd className="font-semibold text-on-surface">{item.brand || '—'}</dd>
                </div>
                <div>
                  <dt className="text-on-surface-variant">IP</dt>
                  <dd className="font-semibold text-on-surface">{item.series || '—'}</dd>
                </div>
                <div>
                  <dt className="text-on-surface-variant">狀態</dt>
                  <dd className="font-semibold text-on-surface">{item.condition}</dd>
                </div>
                <div>
                  <dt className="text-on-surface-variant">賣家</dt>
                  <dd className="font-semibold text-on-surface">{item.sellerName}</dd>
                </div>
              </dl>
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                  出貨方式
                </p>
                {shippingOpts.length > 1 ? (
                  <div className="space-y-2">
                    {shippingOpts.map((opt) => (
                      <label
                        key={opt}
                        className={cn(
                          'flex cursor-pointer items-center gap-3 rounded-xl border-2 px-3 py-2.5 text-sm font-medium',
                          selectedShipping === opt
                            ? 'border-black bg-secondary/15'
                            : 'border-outline bg-white'
                        )}
                      >
                        <input
                          type="radio"
                          name={`shipping-${item.id}`}
                          checked={selectedShipping === opt}
                          onChange={() =>
                            setShippingById((prev) => ({ ...prev, [item.id]: opt }))
                          }
                          className="accent-black"
                        />
                        {opt}
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className={cn(LISTING_FIELD, 'bg-neutral-50')}>{selectedShipping}</p>
                )}
              </div>
            </section>
          );
        })}

        {items.length > 0 && (
          <section className="rounded-2xl border-2 border-outline bg-white p-4 shadow-none">
            <div className="flex items-center justify-between text-sm">
              <span className="text-on-surface-variant">訂單合計（{items.length} 件）</span>
              <span className="text-lg font-black text-primary">NT$ {total.toLocaleString()}</span>
            </div>
            <p className="mt-2 text-xs text-on-surface-variant">
              確認後將建立訂單，並可於購買紀錄或聊天室追蹤進度。
            </p>
          </section>
        )}

        {items.length > 0 && (
          <button
            type="button"
            disabled={submitting}
            onClick={() => void handleConfirm()}
            className="w-full rounded-full premium-gradient py-4 text-sm font-bold text-white disabled:opacity-60"
          >
            {submitting ? '處理中…' : '確認結帳'}
          </button>
        )}
      </main>
    </div>
  );
}
