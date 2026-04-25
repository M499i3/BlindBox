import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import TopBar from '@/src/components/TopBar';
import UserAvatar from '@/src/components/UserAvatar';
import { cn } from '@/src/lib/utils';
import { popmartShowcase } from '@/src/lib/popmartShowcase';

export default function Chat() {
  const navigate = useNavigate();
  const products = popmartShowcase.products;

  const notifications = [
    { title: '系統通知', icon: 'settings', color: 'text-primary', unread: true, to: '/notifications?type=system' },
    { title: '活動快訊', icon: 'campaign', color: 'text-primary', unread: true, to: '/notifications?type=news' },
    { title: '交易動態', icon: 'swap_horiz', color: 'text-slate-400', unread: false, to: '/notifications?type=trade' },
    { title: '客服消息', icon: 'support_agent', color: 'text-slate-400', unread: false, to: '/notifications' },
  ];

  const chats = useMemo(
    () => [
      {
        id: '1',
        name: '潮流收藏家_Ken',
        time: '14:20',
        message: '這款 SKULLPANDA 我找很久了，請問可以議價嗎？',
        status: '交換中',
        statusColor: 'bg-primary',
        product: products[1]?.image ?? products[0]?.image,
        online: true,
      },
      {
        id: '2',
        name: 'Mina_Lab',
        time: '昨天',
        message: '好的，那我現在下單，再麻煩您安排寄送。',
        status: '待付款',
        statusColor: 'bg-amber-500',
        product: products[2]?.image ?? products[0]?.image,
        unread: 2,
      },
      {
        id: '3',
        name: 'BoxBreaker_99',
        time: '週三',
        message: '這系列還有其他的嗎？',
        product: products[3]?.image ?? products[0]?.image,
      },
    ],
    [products]
  );

  return (
    <div className="animate-in fade-in duration-500 pb-28">
      <TopBar title="聊聊" />

      <main className="pt-20 px-5 space-y-10">
        <section>
          <div className="flex justify-between items-end mb-4">
            <h2 className="text-xl font-bold text-on-surface">通知</h2>
            <button type="button" className="text-xs font-semibold text-on-primary-container">
              全部標為已讀
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {notifications.map((notif, idx) => (
              <motion.button
                key={idx}
                type="button"
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate(notif.to)}
                className="w-full h-[132px] glass-card rounded-2xl p-4 flex flex-col items-center justify-center text-center relative group"
              >
                {notif.unread && (
                  <div className="absolute top-2 right-2 w-2.5 h-2.5 bg-primary rounded-full shadow-[0_0_12px_rgba(255,26,26,0.45)]" />
                )}
                <div className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center mb-3 text-slate-400 group-hover:text-primary transition-colors">
                  <span className={cn('material-symbols-outlined', notif.color)} style={{ fontVariationSettings: "'FILL' 1" }}>
                    {notif.icon}
                  </span>
                </div>
                <span className="text-xs font-semibold text-on-surface">{notif.title}</span>
              </motion.button>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-on-surface">聊天室</h2>
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
                  <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full" />
                )}
                {chat.unread != null && (
                  <div className="absolute top-0 right-0 w-5 h-5 bg-primary rounded-full flex items-center justify-center border-2 border-white">
                    <span className="text-[10px] font-bold text-white">{chat.unread}</span>
                  </div>
                )}
              </div>
              <div className="flex-grow min-w-0">
                <div className="flex justify-between items-center mb-1">
                  <h3 className="font-bold text-sm truncate text-on-surface">{chat.name}</h3>
                  <span className="text-[10px] text-on-primary-container">{chat.time}</span>
                </div>
                <p className="text-xs text-on-surface-variant truncate">{chat.message}</p>
                {chat.status && (
                  <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                    <span className={cn('w-1.5 h-1.5 rounded-full bg-primary', chat.statusColor === 'bg-primary' && 'animate-pulse')} />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary">{chat.status}</span>
                  </div>
                )}
              </div>
              {chat.product && (
                <div className="flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border border-black/[0.08] bg-neutral-100">
                  <img className="w-full h-full object-cover" src={chat.product} referrerPolicy="no-referrer" alt="" />
                </div>
              )}
            </motion.button>
          ))}
        </section>
      </main>
    </div>
  );
}
