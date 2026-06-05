import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import TopBar from '@/frontend/presentation/components/TopBar';
import {
  deleteNotification,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  notificationIcon,
  type NotificationItem,
} from '@/frontend/infrastructure/api/notificationsApi';
import { cn } from '@/frontend/shared/utils/cn';
import { navigateWithReturn } from '@/frontend/shared/utils/routeNavigation';

const CATEGORIES = [
  { type: 'system', label: '系統通知', icon: 'settings', iconClass: 'text-accent-amber', iconBg: 'bg-accent-amber/15' },
  { type: 'activity', label: '活動快訊', icon: 'campaign', iconClass: 'text-accent-sky', iconBg: 'bg-accent-sky/15' },
  { type: 'trade', label: '交易動態', icon: 'swap_horiz', iconClass: 'text-accent-coral', iconBg: 'bg-accent-coral/15' },
  { type: 'support', label: '客服消息', icon: 'support_agent', iconClass: 'text-on-surface-variant', iconBg: 'bg-neutral-100' },
] as const;

const TYPE_LABEL: Record<string, string> = {
  system: '系統通知',
  activity: '活動快訊',
  trade: '交易動態',
  support: '客服消息',
};

function formatDateTime(iso: string): string {
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

export default function NotificationsHub() {
  const navigate = useNavigate();
  const location = useLocation();
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

  const filteredSorted = useMemo(() => {
    if (!focus) return [];
    return items
      .filter((n) => n.type === focus)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [items, focus]);

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

  const hasUnread = items.some((n) => !n.isRead);
  const focusUnread = filteredSorted.some((n) => !n.isRead);

  if (focus) {
    const title = TYPE_LABEL[focus] ?? '通知';
    return (
      <div className="animate-in fade-in duration-500 pb-28">
        <TopBar
          title={title}
          showBack
          rightElement={
            focusUnread ? (
              <button
                type="button"
                onClick={async () => {
                  for (const n of filteredSorted.filter((x) => !x.isRead)) {
                    await markNotificationRead(n.id).catch(console.error);
                  }
                  setItems((prev) =>
                    prev.map((n) => (n.type === focus ? { ...n, isRead: true } : n))
                  );
                }}
                className="whitespace-nowrap text-xs font-bold text-primary"
              >
                全部已讀
              </button>
            ) : undefined
          }
        />
        <main className="w-full min-w-0 max-w-full space-y-3 px-5 pt-topbar-content">
          {loading && <p className="text-sm text-on-surface-variant">載入中…</p>}
          {!loading && filteredSorted.length === 0 && (
            <div className="glass-card rounded-2xl p-5 shadow-[4px_4px_0_#111]">
              <p className="text-sm text-on-surface-variant">尚無{title}</p>
            </div>
          )}
          {filteredSorted.map((n) => (
            <article
              key={n.id}
              className={cn(
                'glass-card rounded-2xl p-5 shadow-[4px_4px_0_#111]',
                !n.isRead && 'ring-2 ring-primary/20'
              )}
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-bold text-on-surface">{n.title}</h2>
                  <p className="mt-1 text-[10px] font-semibold text-on-surface-variant">
                    {formatDateTime(n.createdAt)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {!n.isRead && (
                    <span className="text-[10px] font-bold uppercase text-primary">未讀</span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDelete(n.id)}
                    className="text-[10px] font-bold uppercase text-on-surface-variant"
                    aria-label="刪除"
                  >
                    刪除
                  </button>
                </div>
              </div>
              <p className="whitespace-pre-line text-sm leading-relaxed text-on-surface-variant">
                {n.body}
              </p>
              {!n.isRead && (
                <button
                  type="button"
                  onClick={() => handleMarkRead(n.id)}
                  className="mt-3 text-xs font-bold text-primary"
                >
                  標記已讀
                </button>
              )}
            </article>
          ))}
        </main>
      </div>
    );
  }

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
              className="whitespace-nowrap text-xs font-bold text-primary"
            >
              全部已讀
            </button>
          ) : undefined
        }
      />
      <main className="w-full min-w-0 max-w-full space-y-4 px-5 pt-topbar-content">
        {loading && <p className="text-sm text-on-surface-variant">載入中…</p>}
        {!loading &&
          CATEGORIES.map((cat) => {
            const count = items.filter((n) => n.type === cat.type).length;
            const unread = items.filter((n) => n.type === cat.type && !n.isRead).length;
            return (
              <button
                key={cat.type}
                type="button"
                onClick={() => navigateWithReturn(navigate, `/notifications?type=${cat.type}`, location)}
                className="glass-card flex w-full items-center gap-4 rounded-2xl p-4 text-left shadow-[4px_4px_0_#111] active:opacity-95"
              >
                <div
                  className={cn(
                    'flex h-12 w-12 shrink-0 items-center justify-center rounded-full',
                    cat.iconBg
                  )}
                >
                  <span
                    className={cn('material-symbols-outlined', cat.iconClass)}
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    {notificationIcon(cat.type)}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-base font-extrabold text-on-surface">{cat.label}</h2>
                  <p className="mt-0.5 text-xs text-on-surface-variant">
                    {count > 0 ? `${count} 則通知` : '尚無通知'}
                    {unread > 0 ? ` · ${unread} 則未讀` : ''}
                  </p>
                </div>
                <span className="material-symbols-outlined shrink-0 text-on-surface-variant">
                  chevron_right
                </span>
              </button>
            );
          })}
      </main>
    </div>
  );
}
