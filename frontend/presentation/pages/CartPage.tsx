import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createOrder } from '@/frontend/infrastructure/api/ordersApi';
import { isMockDataEnabled } from '@/frontend/lib/popmartShowcase';
import TopBar from '@/frontend/presentation/components/TopBar';
import ListingCardImage from '@/frontend/presentation/components/ListingCardImage';
import { useAppState } from '@/frontend/presentation/providers/AppStateProvider';

function isSeededListingId(id: string): boolean {
  return id.startsWith('l_') || id.startsWith('pm_');
}

export default function CartPage() {
  const navigate = useNavigate();
  const { cartItems, removeFromCart } = useAppState();
  const [checkingOut, setCheckingOut] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const mock = isMockDataEnabled();

  const total = cartItems.reduce((sum, item) => {
    const n = Number(item.price.replace(/[^\d.]/g, ''));
    return sum + (Number.isFinite(n) ? n : 0);
  }, 0);

  const selectedItems = cartItems.filter((item) => selectedIds.includes(item.id));
  const selectedTotal = selectedItems.reduce((sum, item) => {
    const n = Number(item.price.replace(/[^\d.]/g, ''));
    return sum + (Number.isFinite(n) ? n : 0);
  }, 0);

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === cartItems.length) {
      setSelectedIds([]);
      return;
    }
    setSelectedIds(cartItems.map((item) => item.id));
  };

  useEffect(() => {
    const idSet = new Set(cartItems.map((item) => item.id));
    setSelectedIds((prev) => prev.filter((id) => idSet.has(id)));
  }, [cartItems]);

  const handleCheckout = async () => {
    if (cartItems.length === 0) return;
    if (selectedItems.length === 0) {
      alert('請先選擇要結帳的商品');
      return;
    }

    setCheckingOut(true);
    try {
      for (const item of selectedItems) {
        if (mock && isSeededListingId(item.id)) {
          alert('示範商品無法結帳，請改用市集上的真實貼文');
          return;
        }
        await createOrder(item.id);
        await removeFromCart(item.id);
      }
      setSelectedIds((prev) => prev.filter((id) => !selectedItems.some((item) => item.id === id)));
      alert('結帳成功！');
      navigate('/purchase-history');
    } catch (error) {
      console.error(error);
      alert('結帳失敗，請稍後再試');
    } finally {
      setCheckingOut(false);
    }
  };

  return (
    <div className="animate-in fade-in duration-500 pb-28">
      <TopBar showBack title="購物車" />
      <main className="pt-topbar-content px-5 space-y-4 w-full min-w-0 max-w-full">
        {cartItems.length === 0 && (
          <p className="text-sm text-on-surface-variant text-center py-20">購物車目前是空的。</p>
        )}
        {cartItems.length > 0 && (
          <div className="rounded-2xl border-2 border-outline bg-white shadow-none p-3 flex items-center justify-between">
            <button
              type="button"
              onClick={toggleSelectAll}
              className="text-xs px-3 py-1 rounded-full border border-black/[0.12]"
            >
              {selectedIds.length === cartItems.length ? '取消全選' : '全選'}
            </button>
            <p className="text-xs text-on-surface-variant">
              已選 {selectedItems.length} / {cartItems.length} 件
            </p>
          </div>
        )}
        {cartItems.map((item) => (
          <div key={item.id} className="rounded-2xl border-2 border-outline bg-white shadow-none p-3 flex gap-3">
            <label className="pt-1">
              <input
                type="checkbox"
                checked={selectedIds.includes(item.id)}
                onChange={() => toggleSelected(item.id)}
                className="h-4 w-4 accent-black"
                aria-label={`選擇 ${item.title}`}
              />
            </label>
            <ListingCardImage src={item.image} alt={item.title} className="w-20 h-20 rounded-xl" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-on-surface line-clamp-2">{item.title}</p>
              <p className="text-sm font-black text-primary mt-1">{item.price}</p>
              <div className="flex gap-2 mt-2">
                <button type="button" onClick={() => navigate(`/listing/${item.id}`)} className="text-xs px-3 py-1 rounded-full border border-black/[0.12]">
                  查看
                </button>
                <button type="button" onClick={() => removeFromCart(item.id)} className="text-xs px-3 py-1 rounded-full border border-black/[0.12] text-on-surface-variant">
                  移除
                </button>
              </div>
            </div>
          </div>
        ))}

        {cartItems.length > 0 && (
          <section className="rounded-2xl border-2 border-outline bg-white shadow-none p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-on-surface-variant">小計</span>
              <span className="font-bold text-on-surface">
               NT$ {total.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-on-surface-variant">已選商品小計</span>
              <span className="font-bold text-on-surface">
               NT$ {selectedTotal.toLocaleString()}
              </span>
            </div>

            <button
              type="button"
              disabled={checkingOut || selectedItems.length === 0}
              onClick={handleCheckout}
              className="w-full py-3 rounded-full border-2 border-outline bg-primary text-on-primary font-bold text-sm shadow-none disabled:opacity-60"
            >
              {checkingOut ? '結帳中…' : '前往結帳'}
            </button>
          </section>
      )}
      </main>
    </div>
  );
}
