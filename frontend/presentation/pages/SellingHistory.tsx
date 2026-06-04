import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import TopBar from '@/frontend/presentation/components/TopBar';
import UserAvatar from '@/frontend/presentation/components/UserAvatar';
import {
  getMyOrders,
  updateOrderStatus,
  type OrderSummary,
} from '@/frontend/infrastructure/api/ordersApi';

type FilterTab = 'pending' | 'shipped' | 'completed';

const TABS: { key: FilterTab; label: string }[] = [
  { key: 'pending', label: '待出貨' },
  { key: 'shipped', label: '已寄出' },
  { key: 'completed', label: '已完成' },
];

const EMPTY_HINT: Record<FilterTab, string> = {
  pending: '目前沒有待出貨的訂單',
  shipped: '目前沒有已寄出的訂單',
  completed: '目前沒有已完成的訂單',
};

function formatDate(iso: string): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('zh-TW', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function statusColor(status: string): string {
  if (status === 'pending') return 'text-primary';
  if (status === 'shipped' || status === 'delivered') return 'text-blue-500';
  if (status === 'completed') return 'text-emerald-600';
  return 'text-on-surface-variant';
}

function matchesTab(order: OrderSummary, tab: FilterTab): boolean {
  if (tab === 'pending') return order.status === 'pending';
  if (tab === 'shipped') return order.status === 'shipped' || order.status === 'delivered';
  return order.status === 'completed';
}

export default function SellingHistory() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>('pending');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadOrders = useCallback(() => {
    setLoading(true);
    return getMyOrders('seller')
      .then(setOrders)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const filteredOrders = useMemo(
    () => orders.filter((o) => matchesTab(o, activeTab)),
    [orders, activeTab]
  );

  const handleMarkShipped = async (orderId: string) => {
    if (updatingId) return;
    setUpdatingId(orderId);
    try {
      const updated = await updateOrderStatus(orderId, 'shipped');
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? { ...o, status: updated.status, statusLabel: updated.statusLabel }
            : o
        )
      );
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : '更新失敗，請稍後再試');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="animate-in fade-in duration-500 bg-background min-h-screen pb-28">
      <TopBar title="出售紀錄" showBack />

      <main className="pt-topbar-content px-5 max-w-2xl mx-auto w-full min-w-0">
        <div className="flex gap-4 mb-6 overflow-x-auto no-scrollbar pb-2">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`px-6 py-2 rounded-full font-bold text-xs whitespace-nowrap active:scale-95 transition-all ${
                activeTab === tab.key
                  ? 'doodle-press premium-gradient text-white'
                  : 'glass-card text-on-surface-variant'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading && <p className="text-center text-sm text-on-surface-variant py-8">載入中…</p>}
        {!loading && filteredOrders.length === 0 && (
          <p className="text-center text-sm text-on-surface-variant py-8">{EMPTY_HINT[activeTab]}</p>
        )}

        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card rounded-2xl p-4 flex flex-col gap-4"
            >
              <div className="flex justify-between items-start gap-2">
                <div className="flex gap-4 min-w-0">
                  <div className="w-20 h-20 rounded-xl overflow-hidden bg-neutral-100 flex-shrink-0">
                    {order.image ? (
                      <img
                        className="w-full h-full object-cover"
                        src={order.image}
                        alt=""
                        referrerPolicy="no-referrer"
                      />
                    ) : null}
                  </div>
                  <div className="flex flex-col justify-center min-w-0">
                    <h3 className="card-title-2 mb-1 text-sm font-bold leading-snug text-on-surface">
                      {order.title}
                    </h3>
                    <div className="flex items-center gap-2">
                      <UserAvatar size="sm" />
                      <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-tight truncate">
                        買家: {order.counterpartyName}
                      </p>
                    </div>
                    <p className="text-[10px] text-on-surface-variant mt-1 font-bold tracking-tight">
                      {formatDate(order.createdAt)}
                    </p>
                  </div>
                </div>
                <span className={`text-[10px] font-black shrink-0 ${statusColor(order.status)}`}>
                  {order.statusLabel}
                </span>
              </div>

              <div className="flex items-center justify-between gap-3 pt-4 border-t border-black/[0.06]">
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] text-on-surface-variant uppercase font-bold tracking-widest">
                    總計金額
                  </span>
                  <span className="text-primary font-bold text-lg">{order.total}</span>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">
                  {activeTab === 'pending' && order.status === 'pending' ? (
                    <button
                      type="button"
                      disabled={updatingId === order.id}
                      onClick={() => void handleMarkShipped(order.id)}
                      className="px-4 py-2 rounded-full border-2 border-black bg-black text-white text-xs font-bold disabled:opacity-50"
                    >
                      {updatingId === order.id ? '處理中…' : '已寄出'}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => navigate(`/listing/${order.listingId}`)}
                    className="doodle-press px-4 py-2 rounded-full premium-gradient text-white text-xs font-bold"
                  >
                    查看詳情
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
}
