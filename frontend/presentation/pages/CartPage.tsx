import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createOrder } from '@/frontend/infrastructure/api/ordersApi';
import { isMockDataEnabled } from '@/frontend/lib/popmartShowcase';
import TopBar from '@/frontend/presentation/components/TopBar';
import { useAppState } from '@/frontend/presentation/providers/AppStateProvider';

function isSeededListingId(id: string): boolean {
  return id.startsWith('l_') || id.startsWith('pm_');
}

export default function CartPage() {
  const navigate = useNavigate();
  const { cartItems, removeFromCart } = useAppState();
  const [shippingMethod, setShippingMethod] = useState('');
  const [checkingOut, setCheckingOut] = useState(false);
  const mock = isMockDataEnabled();

  const total = cartItems.reduce((sum, item) => {
    const n = Number(item.price.replace(/[^\d.]/g, ''));
    return sum + (Number.isFinite(n) ? n : 0);
  }, 0);

  const handleCheckout = async () => {
    if (!shippingMethod) {
      alert('請選擇配送方式');
      return;
    }
    if (cartItems.length === 0) return;

    setCheckingOut(true);
    try {
      for (const item of cartItems) {
        if (mock && isSeededListingId(item.id)) {
          alert('示範商品無法結帳，請改用市集上的真實貼文');
          return;
        }
        await createOrder(item.id);
        await removeFromCart(item.id);
      }
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
        {cartItems.map((item) => (
          <div key={item.id} className="rounded-2xl border-2 border-outline bg-white shadow-none p-3 flex gap-3">
            <img src={item.image} alt="" className="w-20 h-20 rounded-xl object-cover bg-neutral-100" />
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

            <select
              value={shippingMethod}
              onChange={(e) => setShippingMethod(e.target.value)}
              className="w-full rounded-xl border border-black/[0.12] px-3 py-2 text-sm bg-white"
            >
              <option value="">請選擇配送方式</option>
              <option value="711_store">7-11 店到店</option>
              <option value="family_store">全家店到店</option>
              <option value="in_person">面交</option>
              <option value="post_office">郵寄</option>
            </select>

            <button
              type="button"
              disabled={checkingOut}
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
