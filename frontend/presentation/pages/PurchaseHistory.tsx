import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import TopBar from '@/frontend/presentation/components/TopBar';
import UserAvatar from '@/frontend/presentation/components/UserAvatar';
import {
  getMyOrders,
  updateOrderStatus,
  type OrderSummary,
} from '@/frontend/infrastructure/api/ordersApi';

type FilterTab = 'all' | 'pending' | 'shipped' | 'completed';

const TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待出貨' },
  { key: 'shipped', label: '已寄出' },
  { key: 'completed', label: '已完成' },
];

function formatDate(iso: string): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('zh-TW', {
      year: 'numeric',
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

function matchesShippedTab(status: string): boolean {
  return status === 'shipped' || status === 'delivered';
}

function canBuyerComplete(status: string): boolean {
  return matchesShippedTab(status);
}

export default function PurchaseHistory() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    getMyOrders('buyer')
      .then(setOrders)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filteredOrders = useMemo(() => {
    if (activeTab === 'all') return orders;
    if (activeTab === 'pending') {
      return orders.filter((o) => o.status === 'pending');
    }
    if (activeTab === 'shipped') {
      return orders.filter((o) => matchesShippedTab(o.status));
    }
    return orders.filter((o) => o.status === activeTab);
  }, [orders, activeTab]);

  const handleCompleteOrder = async (orderId: string) => {
    if (updatingId) return;
    setUpdatingId(orderId);
    try {
      const updated = await updateOrderStatus(orderId, 'completed');
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
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`px-6 py-2 rounded-full font-bold text-xs whitespace-nowrap active:scale-95 transition-all ${
                activeTab === tab.key ? 'doodle-press premium-gradient text-white' : 'glass-card text-on-surface-variant'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading && <p className="text-center text-sm text-on-surface-variant py-8">載入中…</p>}
        {!loading && filteredOrders.length === 0 && (
          <p className="text-center text-sm text-on-surface-variant py-8">尚無購買紀錄</p>
        )}

        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card rounded-2xl p-4 flex flex-col gap-4"
            >
              <div className="flex justify-between items-start gap-2">
                <div className="flex gap-4 min-w-0">
                  <div className="w-20 h-20 rounded-xl overflow-hidden bg-neutral-100 flex-shrink-0">
                    {order.image ? (
                      <img className="w-full h-full object-cover" src={order.image} referrerPolicy="no-referrer" alt="" />
                    ) : null}
                  </div>
                  <div className="flex flex-col justify-center min-w-0">
                    <h3 className="card-title-2 mb-1 text-sm font-bold leading-snug text-on-surface">{order.title}</h3>
                    <div className="flex items-center gap-2">
                      <UserAvatar size="sm" />
                      <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-tight truncate">
                        賣家: {order.counterpartyName}
                      </p>
                    </div>
                    <p className="text-[10px] text-on-surface-variant mt-1 uppercase font-bold tracking-tight">
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
                  <span className="text-[10px] text-on-surface-variant uppercase font-bold tracking-widest">總計金額</span>
                  <span className="text-primary font-bold text-lg">{order.total}</span>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">
                  {activeTab === 'shipped' && canBuyerComplete(order.status) ? (
                    <button
                      type="button"
                      disabled={updatingId === order.id}
                      onClick={() => void handleCompleteOrder(order.id)}
                      className="px-4 py-2 rounded-full border-2 border-black bg-black text-white text-xs font-bold disabled:opacity-50"
                    >
                      {updatingId === order.id ? '處理中…' : '完成訂單'}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => navigate(`/listing/${order.listingId}`)}
                    className="doodle-press px-4 py-2 rounded-full premium-gradient text-white text-xs font-bold transition-all"
                  >
                    查看詳情
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {!loading && filteredOrders.length > 0 && (
          <div className="py-12 flex flex-col items-center justify-center text-on-surface-variant opacity-60">
            <span className="material-symbols-outlined text-4xl mb-2">inventory_2</span>
            <p className="text-xs font-bold uppercase tracking-widest">顯示最近 3 個月的交易紀錄</p>
          </div>
        )}
      </main>
    </div>
  );
}
