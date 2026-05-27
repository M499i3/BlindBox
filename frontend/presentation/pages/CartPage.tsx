import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '@/frontend/presentation/components/TopBar';
import { useAppState } from '@/frontend/presentation/providers/AppStateProvider';

export default function CartPage() {
  const navigate = useNavigate();
  const { cartItems, removeFromCart, userId } = useAppState();
  const [shippingMethod, setShippingMethod] = useState('');
  
  console.log(cartItems);

  const total = cartItems.reduce((sum, item) => {
    const n = Number(item.price.replace(/[^\d.]/g, ''));
    return sum + (Number.isFinite(n) ? n : 0);
  }, 0);

  return (
    <div className="animate-in fade-in duration-500 pb-28">
      <TopBar showBack title="購物車" />
      <main className="pt-topbar px-5 max-w-md mx-auto space-y-4">
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
              onClick={async () => {
                if (!shippingMethod) {
                  alert('請選擇配送方式');
                  return;
                }
                console.log('userId =', userId);

                if (!userId) {
                  alert('找不到目前使用者，請重新整理後再試');
                  return;
                }

                try {
                  
                  for (const item of cartItems) {
                    let sellerId = item.seller_id || item.sellerId || item.seller?.id;

                    const isFakeId =
                      item.id.startsWith('l_') ||
                      item.id.startsWith('pm_');

                      if (isFakeId) {
                        const oldOrders = JSON.parse(localStorage.getItem('orders') || '[]');
                      
                        const newOrder = {
                          id: item.id,
                          title: item.title,
                          seller: '測試賣家',
                          date: new Date().toLocaleString(),
                          status: '待付款',
                          statusColor: 'text-primary',
                          total: item.price,
                          image: item.image,
                        };
                      
                        localStorage.setItem('orders', JSON.stringify([newOrder, ...oldOrders]));
                      
                        removeFromCart(item.id);
                        continue;
                      }

                    if (!sellerId && !isFakeId) {
                      const res = await fetch(`http://localhost:8000/api/listings/${item.id}`);
                      const listing = await res.json();
                      sellerId = listing.seller_id;
                    }

                    if (!sellerId) {
                      sellerId = userId;
                    }

                    const token = localStorage.getItem('blindbox_access_token');
                    const orderRes = await fetch('http://localhost:8000/api/orders', {
                    method: 'POST',
                    headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                    listing_id: item.id,
                    buyer_id: userId,
                    seller_id: sellerId,
                    status: 'pending_payment',
                    amount: Number(item.price.replace(/[^\d.]/g, '')),
                    currency: 'TWD',
                    shipping_method: shippingMethod,
                    }),
                  });

if (!orderRes.ok) {
  const text = await orderRes.text();
  console.error('建立訂單失敗:', text);
  alert('建立訂單失敗');
  return;
}
              
                    removeFromCart(item.id);
                  }
              
                  alert('結帳成功！');
                  navigate('/purchase-history');
                } catch (error) {
                  console.error(error);
                  alert('結帳失敗，請稍後再試');
                }
              }}
              className="w-full py-3 premium-gradient rounded-full text-white font-bold text-sm"
            >
              前往結帳
            </button>
          </section>
      )}
      </main>
    </div>
  );
}
