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

function notificationActionLabel(n: NotificationItem): string {
  if (n.actionUrl) return '查看詳情';
  return n.isRead ? '' : '標記已讀';
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

  const handleNotificationAction = async (n: NotificationItem) => {
    if (!n.isRead) {
      await handleMarkRead(n.id);
    }
    if (n.actionUrl) {
      navigateWithReturn(navigate, n.actionUrl, location);
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
          {filteredSorted.map((n) => {
            const actionLabel = notificationActionLabel(n);
            const clickable = Boolean(n.actionUrl || !n.isRead);

            return (
              <article
                key={n.id}
                role={clickable ? 'button' : undefined}
                tabIndex={clickable ? 0 : undefined}
                onClick={clickable ? () => void handleNotificationAction(n) : undefined}
                onKeyDown={
                  clickable
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          void handleNotificationAction(n);
                        }
                      }
                    : undefined
                }
                className={cn(
                  'glass-card rounded-2xl p-4 shadow-[4px_4px_0_#111] transition-all',
                  n.isRead ? 'border-outline/70 bg-white/80 opacity-75' : 'border-primary/40 bg-primary/[0.04] ring-2 ring-primary/15',
                  clickable && 'cursor-pointer active:translate-x-0.5 active:translate-y-0.5 active:shadow-none'
                )}
                aria-label={actionLabel ? `${n.title}，${actionLabel}` : n.title}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      'mt-1 h-2.5 w-2.5 shrink-0 rounded-full',
                      n.isRead ? 'bg-transparent ring-1 ring-outline' : 'bg-primary shadow-[0_0_0_4px_rgb(247_104_91_/_0.12)]'
                    )}
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex min-w-0 items-center">
                      <h2 className={cn('min-w-0 flex-1 text-sm font-extrabold', n.isRead ? 'text-on-surface-variant' : 'text-on-surface')}>
                        {n.title}
                      </h2>
                    </div>
                    <p className="whitespace-pre-line text-sm leading-relaxed text-on-surface-variant">
                      {n.body}
                    </p>
                    <div className="flex min-w-0 items-center justify-between gap-3">
                      <p className="min-w-0 truncate text-[10px] font-semibold text-on-surface-variant">
                        {formatDateTime(n.createdAt)}
                      </p>
                      {actionLabel && (
                        <div className="flex shrink-0 items-center gap-1 text-xs font-bold text-primary">
                          <span>{actionLabel}</span>
                          {n.actionUrl ? (
                            <span className="material-symbols-outlined text-base">chevron_right</span>
                          ) : (
                            <span className="material-symbols-outlined text-base">done</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); void handleDelete(n.id); }}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-on-surface-variant transition-colors active:bg-black/[0.05]"
                    aria-label="刪除通知"
                  >
                    <span className="material-symbols-outlined text-base">delete</span>
                  </button>
                </div>
              </article>
            );
          })}
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
