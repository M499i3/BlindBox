import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import TopBar from '@/frontend/presentation/components/TopBar';
import UserAvatar from '@/frontend/presentation/components/UserAvatar';
import { cn } from '@/frontend/shared/utils/cn';
import { getChats, type ChatInboxItem } from '@/frontend/infrastructure/api/chatsApi';
import {
  getNotifications,
  notificationColor,
  notificationIcon,
  type NotificationItem,
} from '@/frontend/infrastructure/api/notificationsApi';

function formatNotifTime(isoStr: string): string {
  const now = Date.now();
  const ms = new Date(isoStr).getTime();
  const diff = now - ms;
  const min = Math.floor(diff / 60000);
  if (min < 1) return '剛剛';
  if (min < 60) return `${min}分鐘前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}小時前`;
  const d = Math.floor(hr / 24);
  if (d === 1) return '昨天';
  return new Date(isoStr).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' });
}

export default function Chat() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [chats, setChats] = useState<ChatInboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeNotifId, setActiveNotifId] = useState<string | null>(null);
  const activeNotif = useMemo(
    () => notifications.find((n) => n.id === activeNotifId) ?? null,
    [activeNotifId, notifications]
  );

  useEffect(() => {
    Promise.all([getNotifications(), getChats()])
      .then(([n, c]) => {
        setNotifications(n);
        setChats(c);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="w-full min-w-0 max-w-full overflow-x-hidden animate-in fade-in duration-500 pb-28">
      <TopBar title="消息" rightElement={<></>} />

      <main className="pt-topbar-content px-5 space-y-10 w-full min-w-0 max-w-full mx-auto">

        <section>
          <div className="flex justify-between items-end mb-4">
            <h2 className="text-xl font-bold text-on-surface">通知</h2>
            <button
              type="button"
              onClick={() => navigate('/notifications')}
              className="text-xs font-semibold text-on-primary-container"
            >
              查看全部
            </button>
          </div>
          {loading ? (
            <p className="text-sm text-on-surface-variant">載入中…</p>
          ) : notifications.length === 0 ? (
            <p className="text-sm text-on-surface-variant">暫無通知</p>
          ) : (
            <div className="space-y-3">
              {notifications.map((notif) => (
                <div key={notif.id} className="relative">
                  <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                    <span className="text-xs font-bold text-on-surface-variant">刪除</span>
                  </div>
                  <motion.button
                    type="button"
                    drag="x"
                    dragConstraints={{ left: -96, right: 0 }}
                    dragElastic={0.12}
                    whileTap={{ scale: 0.99 }}
                    onDragEnd={(_, info) => {
                      if (info.offset.x < -72) {
                        setNotifications((prev) => prev.filter((n) => n.id !== notif.id));
                      }
                    }}
                    onClick={() => setActiveNotifId(notif.id)}
                    className="relative w-full glass-card shadow-[2px_2px_0_#111] rounded-2xl p-4 flex items-center gap-4 text-left"
                  >
                    {!notif.isRead && (
                      <div className="absolute top-3 right-3 w-2.5 h-2.5 bg-primary rounded-full" />
                    )}
                    <div className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center text-slate-400 flex-shrink-0">
                      <span
                        className={cn('material-symbols-outlined', notificationColor(notif.type, !notif.isRead))}
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        {notificationIcon(notif.type)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-bold text-sm truncate text-on-surface">{notif.title}</h3>
                        <span className="text-[10px] text-on-primary-container whitespace-nowrap">
                          {formatNotifTime(notif.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-on-surface-variant line-clamp-1 mt-1">{notif.body}</p>
                    </div>
                  </motion.button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-on-surface">聊天室</h2>
          {!loading && chats.length === 0 && (
            <p className="text-sm text-on-surface-variant">尚無聊天紀錄</p>
          )}
          {chats.map((chat) => (
            <motion.button
              key={chat.id}
              type="button"
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate(`/chat/${chat.id}`)}
              className="w-full glass-card shadow-[2px_2px_0_#111] rounded-2xl p-4 flex items-center gap-4 text-left"
            >
              <div className="relative">
                <UserAvatar size="lg" />
                {chat.online && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1">
                  <h3 className="font-bold text-on-surface text-sm truncate">{chat.counterpartyName}</h3>
                  <span className="text-[10px] text-on-surface-variant font-bold">{chat.timeLabel}</span>
                </div>
                <p className="text-xs text-on-surface-variant line-clamp-1 mb-1">{chat.lastMessage}</p>
                {chat.statusLabel && (
                  <span className="inline-block text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                    {chat.statusLabel}
                  </span>
                )}
              </div>
              {chat.listingImage && (
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-neutral-100 flex-shrink-0">
                  <img src={chat.listingImage} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
              )}
              {chat.unreadCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">
                  {chat.unreadCount}
                </span>
              )}
            </motion.button>
          ))}
        </section>
      </main>

      {activeNotif && (
        <div className="fixed inset-0 z-[60]">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            onClick={() => setActiveNotifId(null)}
            aria-label="關閉"
          />
          <div className="absolute left-1/2 -translate-x-1/2 bottom-0 w-full max-w-[470px] p-4 pb-8">
            <div className="glass-card shadow-[2px_2px_0_#111] rounded-3xl p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-black text-secondary tracking-wider uppercase">
                    通知
                  </p>
                  <h3 className="text-lg font-extrabold text-on-surface mt-1">{activeNotif.title}</h3>
                  <p className="text-xs text-on-surface-variant mt-1">
                    {formatNotifTime(activeNotif.createdAt)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveNotifId(null)}
                  className="text-on-surface-variant"
                  aria-label="關閉"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <p className="text-sm text-on-surface-variant leading-relaxed mt-4 whitespace-pre-line">
                {activeNotif.body}
              </p>
              <div className="mt-6">
                <button
                  type="button"
                  onClick={() => setActiveNotifId(null)}
                  className="w-full premium-gradient text-white py-3 rounded-full text-sm font-extrabold active:scale-[0.99] transition-transform"
                >
                  知道了
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
