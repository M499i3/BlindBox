import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import TopBar from '@/frontend/presentation/components/TopBar';
import {
  deleteNotification,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  notificationIcon,
  type NotificationItem,
} from '@/frontend/infrastructure/api/notificationsApi';

const BLOCKS = [
  { type: 'system',   label: '系統通知', icon: 'settings' },
  { type: 'activity', label: '活動快訊', icon: 'campaign' },
  { type: 'trade',    label: '交易通知', icon: 'swap_horiz' },
  { type: 'support',  label: '客服消息', icon: 'support_agent' },
];

export default function NotificationsHub() {
  const [params] = useSearchParams();
  const focus = params.get('type');
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    return getNotifications().then(setItems).catch(console.error);
  }, []);

  useEffect(() => {
    reload().finally(() => setLoading(false));
  }, [reload]);

  const handleMarkRead = async (id: string) => {
    const target = items.find((n) => n.id === id);
    if (!target || target.isRead) return;
    try {
      await markNotificationRead(id);
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteNotification(id);
      setItems((prev) => prev.filter((n) => n.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (e) {
      console.error(e);
    }
  };

  const visibleBlocks = focus
    ? BLOCKS.filter((b) => b.type === focus || (focus === 'news' && b.type === 'activity'))
    : BLOCKS;

  const hasUnread = items.some((n) => !n.isRead);

  return (
    <div className="animate-in fade-in duration-500 pb-28">
      <TopBar
        title="通知中心"
        showBack
        rightElement={
          hasUnread ? (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="text-xs font-bold text-primary whitespace-nowrap"
            >
              全部已讀
            </button>
          ) : undefined
        }
      />
      <main className="pt-topbar-content px-5 space-y-6 w-full min-w-0 max-w-full">
        {loading && <p className="text-sm text-on-surface-variant">載入中…</p>}
        {!loading &&
          visibleBlocks.map((b) => {
            const blockItems = items.filter((n) => n.type === b.type);
            const blockHasUnread = blockItems.some((n) => !n.isRead);
            return (
              <section key={b.type}>
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className="material-symbols-outlined text-on-surface-variant text-[20px]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    {notificationIcon(b.type)}
                  </span>
                  <h2 className="text-base font-extrabold text-on-surface">{b.label}</h2>
                  {blockHasUnread && (
                    <span className="text-[10px] font-bold text-primary uppercase ml-auto">
                      有未讀
                    </span>
                  )}
                </div>
                {blockItems.length === 0 ? (
                  <div className="glass-card shadow-[4px_4px_0_#111] rounded-2xl p-5">
                    <p className="text-sm text-on-surface-variant">目前沒有{b.label}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {blockItems.map((n) => (
                      <div
                        key={n.id}
                        className={`glass-card shadow-[4px_4px_0_#111] rounded-2xl p-5 ${!n.isRead ? 'ring-2 ring-primary/20' : ''}`}
                      >
                        <div className="flex justify-between items-start gap-2 mb-2">
                          <button
                            type="button"
                            onClick={() => handleMarkRead(n.id)}
                            className="text-sm font-bold text-on-surface text-left flex-1"
                          >
                            {n.title}
                          </button>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {!n.isRead && (
                              <span className="text-[10px] font-bold text-primary uppercase">未讀</span>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDelete(n.id)}
                              className="text-[10px] font-bold text-on-surface-variant uppercase"
                              aria-label="刪除通知"
                            >
                              刪除
                            </button>
                          </div>
                        </div>
                        <p className="text-sm text-on-surface-variant leading-relaxed whitespace-pre-line">
                          {n.body}
                        </p>
                        {!n.isRead && (
                          <button
                            type="button"
                            onClick={() => handleMarkRead(n.id)}
                            className="mt-3 text-xs font-bold text-primary"
                          >
                            標為已讀
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
      </main>
    </div>
  );
}
