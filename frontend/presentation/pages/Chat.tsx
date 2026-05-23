import React, { useEffect, useState } from 'react';
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

const NOTIF_ROUTES: Record<string, string> = {
  system: '/notifications?type=system',
  activity: '/notifications?type=activity',
  trade: '/notifications?type=trade',
  support: '/notifications',
};

export default function Chat() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [chats, setChats] = useState<ChatInboxItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getNotifications(), getChats()])
      .then(([n, c]) => {
        setNotifications(n);
        setChats(c);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const notifTiles = notifications.slice(0, 4);

  return (
    <div className="animate-in fade-in duration-500 pb-28">
      <TopBar title="聊聊" />

      <main className="pt-20 px-5 space-y-10">
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
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {notifTiles.map((notif) => (
                <motion.button
                  key={notif.id}
                  type="button"
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate(NOTIF_ROUTES[notif.type] ?? '/notifications')}
                  className="w-full h-[132px] glass-card rounded-2xl p-4 flex flex-col items-center justify-center text-center relative group"
                >
                  {!notif.isRead && (
                    <div className="absolute top-2 right-2 w-2.5 h-2.5 bg-primary rounded-full shadow-[0_0_12px_rgba(255,26,26,0.45)]" />
                  )}
                  <div className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center mb-3 text-slate-400 group-hover:text-primary transition-colors">
                    <span
                      className={cn('material-symbols-outlined', notificationColor(notif.type, !notif.isRead))}
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      {notificationIcon(notif.type)}
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-on-surface line-clamp-2">{notif.typeLabel}</span>
                </motion.button>
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
              className="w-full glass-card rounded-2xl p-4 flex items-center gap-4 text-left"
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
    </div>
  );
}
