import React from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import TopBar from '@/src/components/TopBar';
import UserAvatar from '@/src/components/UserAvatar';
import { popmartShowcase } from '@/src/lib/popmartShowcase';
import { useAppState } from '@/src/context/AppState';

export default function Profile() {
  const navigate = useNavigate();
  const { avatarDataUrl, listings } = useAppState();
  const listingPreview = listings.slice(0, 2).map((l) => ({ id: l.id, title: l.title, price: l.price, image: l.image }));

  const stats = [
    { label: '收藏數', value: '42' },
    { label: '願望清單', value: '15' },
    { label: '上架中', value: '08' },
    { label: '已完成', value: '128' },
  ];

  const menuItems = [
    { label: '購買記錄', icon: 'shopping_bag', to: '/purchase-history' },
    { label: '出售紀錄', icon: 'sell', to: '/profile/selling' },
    { label: '我的商品 listing', icon: 'list_alt', to: '/profile/listings' },
    {
      label: '收藏冊',
      icon: 'auto_stories',
      to: '/explore?tab=collection&sub=catalog',
      separator: true,
    },
    {
      label: '願望清單',
      icon: 'favorite',
      to: '/explore?tab=collection&sub=wishlist',
    },
  ];

  return (
    <div className="animate-in fade-in duration-500 pb-28">
      <TopBar
        title="個人檔案"
        rightElement={
          <>
            <button
              type="button"
              onClick={() => navigate('/profile/edit')}
              className="text-black"
              aria-label="設定"
            >
              <span className="material-symbols-outlined">settings</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/notifications')}
              className="text-black"
              aria-label="通知"
            >
              <span className="material-symbols-outlined">notifications</span>
            </button>
          </>
        }
      />

      <main className="pt-20 px-5 space-y-8 max-w-md mx-auto">
        <section className="flex flex-col items-center">
          <div className="relative mb-4">
            <div className="rounded-full p-1 bg-gradient-to-tr from-primary to-tertiary-fixed shadow-[0_0_20px_rgba(255,26,26,0.15)]">
              {avatarDataUrl ? (
                <img src={avatarDataUrl} alt="" className="w-24 h-24 rounded-full object-cover border-4 border-white" />
              ) : (
                <UserAvatar size="xl" className="border-4 border-white !bg-[#ededed]" />
              )}
            </div>
            <button
              type="button"
              onClick={() => navigate('/profile/edit')}
              className="absolute bottom-0 right-0 bg-primary rounded-full p-1.5 border-2 border-white shadow-sm"
              aria-label="編輯個人檔案"
            >
              <span className="material-symbols-outlined text-[14px] text-white" style={{ fontVariationSettings: "'FILL' 1" }}>
                edit
              </span>
            </button>
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-bold text-on-surface">Yu</h2>
            <p className="text-xs font-semibold text-on-primary-container tracking-wider uppercase opacity-60">
              ID: 88204912
            </p>
            <div className="flex items-center justify-center gap-2 mt-2 px-3 py-1 bg-white rounded-full border border-black/[0.08] shadow-sm">
              <span className="material-symbols-outlined text-amber-500 text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
                star
              </span>
              <span className="font-bold text-sm text-on-surface">4.9</span>
              <span className="text-on-surface-variant text-xs">| 128 筆成交</span>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-4 gap-3">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="glass-card rounded-2xl p-4 flex flex-col items-center justify-center text-center"
            >
              <span className="text-2xl font-bold text-primary">{stat.value}</span>
              <span className="text-[10px] text-on-surface-variant mt-1 uppercase font-bold tracking-tighter">
                {stat.label}
              </span>
            </div>
          ))}
        </section>

        <section>
          <div className="flex justify-between items-end mb-4">
            <h3 className="text-lg font-bold text-on-surface">我的商品 Listing</h3>
            <button
              type="button"
              onClick={() => navigate('/profile/listings')}
              className="text-primary text-xs font-bold"
            >
              查看全部
            </button>
          </div>
          {listingPreview.length > 0 ? (
            <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
              {listingPreview.map((p) => (
                <motion.button
                  key={p.id}
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate(`/listing/${p.id}`)}
                  className="flex-shrink-0 w-40 glass-card rounded-2xl overflow-hidden text-left"
                >
                  <div className="aspect-square relative bg-neutral-100">
                    <img className="w-full h-full object-cover" src={p.image} referrerPolicy="no-referrer" alt="" />
                    <div className="absolute top-2 right-2 px-2 py-0.5 bg-black/60 backdrop-blur-md rounded text-[8px] font-bold text-white border border-white/10">
                      上架中
                    </div>
                  </div>
                  <div className="p-3">
                    <h4 className="text-xs font-bold text-on-surface line-clamp-2 leading-snug">{p.title}</h4>
                    <p className="text-sm font-bold text-primary mt-1">{p.price}</p>
                  </div>
                </motion.button>
              ))}
            </div>
          ) : (
            <div className="glass-card rounded-2xl p-5 text-sm text-on-surface-variant">
              還沒有上架貼文，先去新增一篇吧。
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => navigate('/add-listing')}
                  className="premium-gradient text-white px-5 py-2.5 rounded-full text-xs font-extrabold"
                >
                  新增上架
                </button>
              </div>
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div className="glass-card rounded-3xl overflow-hidden">
            {menuItems.slice(0, 3).map((item, idx) => (
              <motion.button
                key={item.label}
                type="button"
                whileTap={{ backgroundColor: 'rgba(0,0,0,0.03)' }}
                onClick={() => navigate(item.to)}
                className="w-full flex items-center justify-between p-4 border-b border-black/[0.06] last:border-0 text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center text-on-surface-variant">
                    <span className="material-symbols-outlined">{item.icon}</span>
                  </div>
                  <span className="text-sm font-semibold text-on-surface">{item.label}</span>
                </div>
                <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
              </motion.button>
            ))}
          </div>

          <div className="glass-card rounded-3xl overflow-hidden">
            {menuItems.slice(3, 5).map((item) => (
              <motion.button
                key={item.label}
                type="button"
                whileTap={{ backgroundColor: 'rgba(0,0,0,0.03)' }}
                onClick={() => navigate(item.to)}
                className="w-full flex items-center justify-between p-4 border-b border-black/[0.06] last:border-0 text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center text-on-surface-variant">
                    <span className="material-symbols-outlined">{item.icon}</span>
                  </div>
                  <span className="text-sm font-semibold text-on-surface">{item.label}</span>
                </div>
                <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
              </motion.button>
            ))}
          </div>

          <div className="glass-card rounded-3xl overflow-hidden">
            <motion.button
              type="button"
              whileTap={{ backgroundColor: 'rgba(0,0,0,0.03)' }}
              onClick={() => navigate('/profile/edit')}
              className="w-full flex items-center justify-between p-4 text-left"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center text-on-surface-variant">
                  <span className="material-symbols-outlined">manage_accounts</span>
                </div>
                <span className="text-sm font-semibold text-on-surface">帳號設定</span>
              </div>
              <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
            </motion.button>
          </div>
        </section>

        <section className="pb-8">
          <button
            type="button"
            onClick={() => navigate('/add-listing')}
            className="w-full py-4 premium-gradient rounded-full text-white font-bold tracking-wide shadow-lg shadow-primary/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'wght' 700" }}>
              add_circle
            </span>
            新增上架商品
          </button>
        </section>
      </main>
    </div>
  );
}
