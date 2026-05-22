import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import TopBar from '@/frontend/presentation/components/TopBar';
import UserAvatar from '@/frontend/presentation/components/UserAvatar';
import { cn } from '@/frontend/shared/utils/cn';
import { useCatalogProducts } from '@/frontend/presentation/hooks/useCatalog';

export default function Chat() {
  const navigate = useNavigate();
  const { products } = useCatalogProducts();

  const [notifications, setNotifications] = useState(
    () =>
      [
        {
          id: 'n1',
          title: '系統通知',
          icon: 'settings',
          color: 'text-primary',
          unread: true,
          time: '剛剛',
          message: '你的帳號安全設定已更新。',
          body: '你的帳號安全設定已更新。\n\n若不是你本人操作，請立即前往帳號設定變更密碼並啟用雙重驗證。',
        },
        {
          id: 'n2',
          title: '活動快訊',
          icon: 'campaign',
          color: 'text-primary',
          unread: true,
          time: '10:12',
          message: '限時活動開跑：收藏達成解鎖限定徽章。',
          body: '限時活動開跑：收藏達成解鎖限定徽章。\n\n活動期間內完成指定收藏任務，即可獲得限定徽章與專屬頭像框（示意）。',
        },
        {
          id: 'n3',
          title: '交易動態',
          icon: 'swap_horiz',
          color: 'text-slate-400',
          unread: false,
          time: '昨天',
          message: '你的交換申請已更新狀態，點此查看詳情。',
          body: '你的交換申請已更新狀態。\n\n請前往貼文詳情確認對方需求與寄送方式。',
        },
        {
          id: 'n4',
          title: '客服消息',
          icon: 'support_agent',
          color: 'text-slate-400',
          unread: false,
          time: '週三',
          message: '我們已收到你的回報，將在 24 小時內回覆。',
          body: '我們已收到你的回報，將在 24 小時內回覆。\n\n若需補充資料，請直接回覆此訊息並附上截圖。',
        },
      ] as const
  );

  const [activeNotifId, setActiveNotifId] = useState<string | null>(null);
  const activeNotif = useMemo(
    () => notifications.find((n) => n.id === activeNotifId) ?? null,
    [activeNotifId, notifications]
  );

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
      <TopBar title="消息" rightElement={<></>} />

      <main className="pt-20 px-5 space-y-10 max-w-md mx-auto">

        <section>
          <div className="flex justify-between items-end mb-4">
            <h2 className="text-xl font-bold text-on-surface">通知</h2>
            <button type="button" className="text-xs font-semibold text-on-primary-container">
              全部標為已讀
            </button>
          </div>
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
                  className="relative w-full glass-card rounded-2xl p-4 flex items-center gap-4 text-left"
                >
                  {notif.unread && (
                    <div className="absolute top-3 right-3 w-2.5 h-2.5 bg-primary rounded-full shadow-[0_0_12px_rgba(255,26,26,0.45)]" />
                  )}
                  <div className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center text-slate-400 flex-shrink-0">
                    <span
                      className={cn('material-symbols-outlined', notif.color)}
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      {notif.icon}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-bold text-sm truncate text-on-surface">{notif.title}</h3>
                      <span className="text-[10px] text-on-primary-container whitespace-nowrap">{notif.time}</span>
                    </div>
                    <p className="text-xs text-on-surface-variant line-clamp-1 mt-1">{notif.message}</p>
                  </div>
                </motion.button>
              </div>
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

      {activeNotif && (
        <div className="fixed inset-0 z-[60]">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            onClick={() => setActiveNotifId(null)}
            aria-label="關閉"
          />
          <div className="absolute left-1/2 -translate-x-1/2 bottom-0 w-full max-w-[470px] p-4 pb-8">
            <div className="glass-card rounded-3xl p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-black text-secondary tracking-wider uppercase">
                    通知
                  </p>
                  <h3 className="text-lg font-extrabold text-on-surface mt-1">{activeNotif.title}</h3>
                  <p className="text-xs text-on-surface-variant mt-1">{activeNotif.time}</p>
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
