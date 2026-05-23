import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import TopBar from '@/frontend/presentation/components/TopBar';
import { getNotifications, type NotificationItem } from '@/frontend/infrastructure/api/notificationsApi';

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

  const filtered = focus
    ? items.filter((n) => n.type === focus || (focus === 'news' && n.type === 'activity'))
    : items;

  return (
    <div className="animate-in fade-in duration-500 pb-28">
      <TopBar title="通知中心" showBack />
      <main className="pt-20 px-5 space-y-4 max-w-md mx-auto">
        {loading && <p className="text-sm text-on-surface-variant">載入中…</p>}
        {!loading && filtered.length === 0 && (
          <p className="text-sm text-on-surface-variant">沒有通知</p>
        )}
        {filtered.map((n) => (
          <section
            key={n.id}
            className={`glass-card rounded-2xl p-5 ${!n.isRead ? 'ring-2 ring-primary/20' : ''}`}
          >
            <div className="flex justify-between items-start gap-2 mb-2">
              <h2 className="text-lg font-bold text-on-surface">{n.title}</h2>
              {!n.isRead && (
                <span className="text-[10px] font-bold text-primary uppercase">未讀</span>
              )}
            </div>
            <p className="text-sm text-on-surface-variant leading-relaxed whitespace-pre-line">{n.body}</p>
            <p className="text-xs text-on-surface-variant mt-3 opacity-70">
              {n.typeLabel}
            </p>
          </section>
        ))}
      </main>
    </div>
  );
}
