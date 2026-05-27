import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import TopBar from '@/frontend/presentation/components/TopBar';
import {
  getNotifications,
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

  useEffect(() => {
    getNotifications()
      .then(setItems)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const visibleBlocks = focus
    ? BLOCKS.filter((b) => b.type === focus || (focus === 'news' && b.type === 'activity'))
    : BLOCKS;

  return (
    <div className="animate-in fade-in duration-500 pb-28">
      <TopBar title="通知中心" showBack />
      <main className="pt-topbar-content px-5 space-y-6 w-full min-w-0 max-w-full">
        {loading && <p className="text-sm text-on-surface-variant">載入中…</p>}
        {!loading &&
          visibleBlocks.map((b) => {
            const blockItems = items.filter((n) => n.type === b.type);
            const hasUnread = blockItems.some((n) => !n.isRead);
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
                  {hasUnread && (
                    <span className="text-[10px] font-bold text-primary uppercase ml-auto">
                      有未讀
                    </span>
                  )}
                </div>
                {blockItems.length === 0 ? (
                  <div className="glass-card rounded-2xl p-5">
                    <p className="text-sm text-on-surface-variant">目前沒有{b.label}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {blockItems.map((n) => (
                      <div
                        key={n.id}
                        className={`glass-card rounded-2xl p-5 ${!n.isRead ? 'ring-2 ring-primary/20' : ''}`}
                      >
                        <div className="flex justify-between items-start gap-2 mb-2">
                          <h3 className="text-sm font-bold text-on-surface">{n.title}</h3>
                          {!n.isRead && (
                            <span className="text-[10px] font-bold text-primary uppercase flex-shrink-0">未讀</span>
                          )}
                        </div>
                        <p className="text-sm text-on-surface-variant leading-relaxed whitespace-pre-line">
                          {n.body}
                        </p>
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
