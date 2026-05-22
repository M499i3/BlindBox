import React from 'react';
import { motion } from 'motion/react';
import TopBar from '@/frontend/presentation/components/TopBar';
import UserAvatar from '@/frontend/presentation/components/UserAvatar';
import { useCatalogProducts } from '@/frontend/presentation/hooks/useCatalog';

export default function SellingHistory() {
  const { products } = useCatalogProducts();
  const rows = products.slice(10, 13).map((p, i) => ({
    id: p.id,
    title: p.title,
    buyer: `買家_${i + 1}`,
    date: `2024-12-${20 + i} 16:00`,
    status: i === 0 ? '已出貨' : i === 1 ? '待買家取貨' : '已完成',
    total: p.price,
    image: p.image,
  }));

  return (
    <div className="animate-in fade-in duration-500 pb-28">
      <TopBar title="出售紀錄" showBack />

      <main className="pt-topbar px-5 space-y-4 max-w-md mx-auto">
        {rows.map((order) => (
          <motion.div
            key={order.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-2xl p-4 flex gap-4"
          >
            <div className="w-20 h-20 rounded-xl overflow-hidden bg-neutral-100 flex-shrink-0">
              <img
                src={order.image}
                alt=""
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-on-surface line-clamp-2">{order.title}</h3>
              <div className="flex items-center gap-2 mt-2">
                <UserAvatar size="sm" />
                <span className="text-[10px] text-on-surface-variant truncate">{order.buyer}</span>
              </div>
              <p className="text-[10px] text-on-surface-variant mt-1">{order.date}</p>
              <div className="flex justify-between items-center mt-2">
                <span className="text-sm font-bold text-primary">{order.total}</span>
                <span className="text-[10px] font-bold text-primary">{order.status}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </main>
    </div>
  );
}
