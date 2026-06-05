import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import TopBar from '@/frontend/presentation/components/TopBar';
import UserAvatar from '@/frontend/presentation/components/UserAvatar';
import { getChats, type ChatInboxItem } from '@/frontend/infrastructure/api/chatsApi';
import {
  getNotifications,
  notificationIcon,
  type NotificationItem,
} from '@/frontend/infrastructure/api/notificationsApi';

const NOTIF_CATEGORIES = [
  { type: 'system', label: '系統通知' },
  { type: 'activity', label: '活動快訊' },
  { type: 'trade', label: '交易動態' },
] as const;

const CHAT_SECTIONS: { kind: ChatInboxItem['listingTradeKind']; label: string }[] = [
  { kind: 'sell', label: '販售' },
  { kind: 'split', label: '拆盒團' },
  { kind: 'swap', label: '交換' },
];

function ChatRow({ chat, onOpen }: { chat: ChatInboxItem; onOpen: () => void }) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.98 }}
      onClick={onOpen}
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
        {chat.statusLabel ? (
          <span className="inline-block text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
            {chat.statusLabel}
          </span>
        ) : null}
      </div>
      {chat.listingImage ? (
        <div className="w-12 h-12 rounded-lg overflow-hidden bg-neutral-100 flex-shrink-0">
          <img src={chat.listingImage} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        </div>
      ) : null}
      {chat.unreadCount > 0 ? (
        <span className="w-5 h-5 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">
          {chat.unreadCount}
        </span>
      ) : null}
    </motion.button>
  );
}

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

  const chatsByKind = useMemo(() => {
    const map: Record<ChatInboxItem['listingTradeKind'], ChatInboxItem[]> = {
      sell: [],
      split: [],
      swap: [],
    };
    for (const chat of chats) {
      const kind = chat.listingTradeKind in map ? chat.listingTradeKind : 'sell';
      map[kind].push(chat);
    }
    return map;
  }, [chats]);

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
              通知中心
            </button>
          </div>

          <div className="mb-4 grid grid-cols-3 gap-2">
            {NOTIF_CATEGORIES.map((cat) => {
              const unread = notifications.filter((n) => n.type === cat.type && !n.isRead).length;
              return (
                <button
                  key={cat.type}
                  type="button"
                  onClick={() => navigate(`/notifications?type=${cat.type}`, { replace: true })}
                  className="glass-card rounded-2xl px-2 py-3 text-center shadow-[2px_2px_0_#111] active:opacity-95"
                >
                  <span
                    className="material-symbols-outlined text-lg text-on-surface-variant"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    {notificationIcon(cat.type)}
                  </span>
                  <p className="mt-1 text-[10px] font-bold leading-tight text-on-surface">{cat.label}</p>
                  {unread > 0 ? (
                    <p className="mt-0.5 text-[9px] font-bold text-primary">{unread} 未讀</p>
                  ) : null}
                </button>
              );
            })}
          </div>
        </section>

        <section className="space-y-6">
          <h2 className="text-xl font-bold text-on-surface">聊天室</h2>
          {!loading && chats.length === 0 && (
            <p className="text-sm text-on-surface-variant">尚無聊天紀錄</p>
          )}
          {CHAT_SECTIONS.map((section) => {
            const sectionChats = chatsByKind[section.kind];
            if (!sectionChats.length) return null;
            return (
              <div key={section.kind} className="space-y-3">
                <h3 className="text-sm font-bold text-on-surface-variant">{section.label}</h3>
                <div className="space-y-3">
                  {sectionChats.map((chat) => (
                    <ChatRow key={chat.id} chat={chat} onOpen={() => navigate(`/chat/${chat.id}`)} />
                  ))}
                </div>
              </div>
            );
          })}
        </section>
      </main>
    </div>
  );
}
