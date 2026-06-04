import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import TopBar from '@/frontend/presentation/components/TopBar';
import UserAvatar from '@/frontend/presentation/components/UserAvatar';
import { getMyOrders, type OrderSummary } from '@/frontend/infrastructure/api/ordersApi';

function formatDate(iso: string): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleString('zh-TW', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function SellingHistory() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyOrders('seller')
      .then(setRows)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="animate-in fade-in duration-500 pb-28">
      <TopBar title="出售紀錄" showBack />

      <main className="pt-topbar-content px-5 space-y-4 w-full min-w-0 max-w-full">
        {loading && <p className="text-center text-sm text-on-surface-variant py-8">載入中…</p>}
        {!loading && rows.length === 0 && (
          <p className="text-center text-sm text-on-surface-variant py-8">尚無出售紀錄</p>
        )}
        {rows.map((order) => (
          <motion.button
            key={order.id}
            type="button"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => navigate(`/listing/${order.listingId}`)}
            className="w-full glass-card rounded-2xl p-4 flex gap-4 text-left"
          >
            <div className="w-20 h-20 rounded-xl overflow-hidden bg-neutral-100 flex-shrink-0">
              {order.image ? (
                <img
                  src={order.image}
                  alt=""
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : null}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="card-title-2 text-sm font-bold leading-snug text-on-surface">{order.title}</h3>
              <div className="flex items-center gap-2 mt-2">
                <UserAvatar size="sm" />
                <span className="text-[10px] text-on-surface-variant truncate">{order.counterpartyName}</span>
              </div>
              <p className="text-[10px] text-on-surface-variant mt-1">{formatDate(order.createdAt)}</p>
              <div className="flex justify-between items-center mt-2">
                <span className="text-sm font-bold text-primary">{order.total}</span>
                <span className="text-[10px] font-bold text-primary">{order.statusLabel}</span>
              </div>
            </div>
          </motion.button>
        ))}
      </main>
    </div>
  );
}
