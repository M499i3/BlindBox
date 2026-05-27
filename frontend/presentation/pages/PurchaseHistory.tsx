import React from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import TopBar from '@/frontend/presentation/components/TopBar';
import UserAvatar from '@/frontend/presentation/components/UserAvatar';
import { useCatalogProducts } from '@/frontend/presentation/hooks/useCatalog';

export default function PurchaseHistory() {
  const navigate = useNavigate();
  const { products } = useCatalogProducts();
  const orders = products.slice(4, 7).map((p, i) => ({
    id: p.id,
    title: p.title,
    seller: `賣家_${i + 1}`,
    date: `2024-11-${24 - i} 14:20`,
    status: i === 0 ? '待付款' : i === 1 ? '已寄出' : '已完成',
    statusColor: i === 0 ? 'text-primary' : i === 1 ? 'text-blue-500' : 'text-emerald-600',
    total: p.price,
    image: p.image,
  }));

  let localOrders = [];

  try {
    localOrders = JSON.parse(
      localStorage.getItem('orders') || '[]'
    );
  } catch (error) {
    console.error('Failed to parse orders:', error);
    localStorage.removeItem('orders');
  }
  
  const orderMap = new Map();

localOrders.forEach((order) => {
  orderMap.set(order.id, order);
});

orders.forEach((order) => {
  orderMap.set(order.id, order);
});

const allOrders = Array.from(orderMap.values());

  return (
    <div className="animate-in fade-in duration-500 bg-background min-h-screen pb-28">
      <TopBar
        showBack
        title="購買紀錄"
        rightElement={
          <div className="flex gap-4">
            <button type="button" onClick={() => navigate('/search')} className="text-black" aria-label="搜尋">
              <span className="material-symbols-outlined">search</span>
            </button>
            <button type="button" onClick={() => navigate('/notifications')} className="text-primary" aria-label="通知">
              <span className="material-symbols-outlined">notifications</span>
            </button>
          </div>
        }
      />

      <main className="pt-20 pb-32 px-5 max-w-2xl mx-auto">
        <div className="flex gap-4 mb-8 overflow-x-auto no-scrollbar pb-2">
          {['全部', '待付款', '已寄出', '已完成'].map((tab, idx) => (
            <button
              key={tab}
              type="button"
              className={`px-6 py-2 rounded-full font-bold text-xs whitespace-nowrap active:scale-95 transition-all ${
                idx === 0 ? 'premium-gradient text-white shadow-lg' : 'glass-card text-on-surface-variant'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {allOrders.map((order) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card rounded-2xl p-4 flex flex-col gap-4 shadow-sm"
            >
              <div className="flex justify-between items-start gap-2">
                <div className="flex gap-4 min-w-0">
                  <div className="w-20 h-20 rounded-xl overflow-hidden bg-neutral-100 flex-shrink-0">
                    <img className="w-full h-full object-cover" src={order.image} referrerPolicy="no-referrer" alt="" />
                  </div>
                  <div className="flex flex-col justify-center min-w-0">
                    <h3 className="font-bold text-on-surface text-sm line-clamp-2 mb-1">{order.title}</h3>
                    <div className="flex items-center gap-2">
                      <UserAvatar size="sm" />
                      <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-tight truncate">
                        賣家: {order.seller}
                      </p>
                    </div>
                    <p className="text-[10px] text-on-surface-variant mt-1 uppercase font-bold tracking-tight">
                      {order.date}
                    </p>
                  </div>
                </div>
                <span className={`text-[10px] font-black shrink-0 ${order.statusColor}`}>{order.status}</span>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-black/[0.06]">
                <div className="flex flex-col">
                  <span className="text-[10px] text-on-surface-variant uppercase font-bold tracking-widest">總計金額</span>
                  <span className="text-primary font-bold text-lg">{order.total}</span>
                </div>
                <button
                  type="button"
                  onClick={() => navigate(`/product/${order.id}`)}
                  className="px-6 py-2 rounded-full premium-gradient text-white text-xs font-bold active:scale-95 transition-all shadow-lg shadow-primary/25"
                >
                  查看詳情
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="py-12 flex flex-col items-center justify-center text-on-surface-variant opacity-60">
          <span className="material-symbols-outlined text-4xl mb-2">inventory_2</span>
          <p className="text-xs font-bold uppercase tracking-widest">顯示最近 3 個月的交易紀錄</p>
        </div>
      </main>
    </div>
  );
}
