import React from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '@/src/components/TopBar';
import { useAppState } from '@/src/context/AppState';

export default function CartPage() {
  const navigate = useNavigate();
  const { cartIds, posts, removeFromCart } = useAppState();
  const cartItems = posts.filter((l) => cartIds.includes(l.id));
  const total = cartItems.reduce((sum, item) => {
    const n = Number(item.price.replace(/[^\d.]/g, ''));
    return sum + (Number.isFinite(n) ? n : 0);
  }, 0);

  return (
    <div className="animate-in fade-in duration-500 pb-28">
      <TopBar showBack title="購物車" />
      <main className="pt-20 px-5 max-w-md mx-auto space-y-4">
        {cartItems.length === 0 && (
          <p className="text-sm text-on-surface-variant text-center py-20">購物車目前是空的。</p>
        )}
        {cartItems.map((item) => (
          <div key={item.id} className="glass-card rounded-2xl p-3 flex gap-3">
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
          <section className="glass-card rounded-2xl p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-on-surface-variant">小計</span>
              <span className="font-bold text-on-surface">NT$ {total.toLocaleString()}</span>
            </div>
            <button type="button" className="w-full py-3 premium-gradient rounded-full text-white font-bold text-sm">
              前往結帳（原型）
            </button>
          </section>
        )}
      </main>
    </div>
  );
}
