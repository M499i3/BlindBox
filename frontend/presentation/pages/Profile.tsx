import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CollectionTreeModal from '@/frontend/presentation/components/CollectionTreeModal';
import TopBar from '@/frontend/presentation/components/TopBar';
import UserAvatar from '@/frontend/presentation/components/UserAvatar';
import { getMyOrders } from '@/frontend/infrastructure/api/ordersApi';
import { useProductCollection } from '@/frontend/presentation/hooks/useProductCollection';
import { useAppState } from '@/frontend/presentation/providers/AppStateProvider';
import { useAuth } from '@/frontend/presentation/providers/AuthProvider';

export default function Profile() {
  const navigate = useNavigate();
  const { avatarDataUrl, displayName, displayId, ratingAvg, ratingCount, transactionCount, listings, openWantModal } =
    useAppState();
  const collection = useProductCollection();
  const { logout, user } = useAuth();
  const [activeModal, setActiveModal] = useState<null | 'collection'>(null);
  const [purchaseCount, setPurchaseCount] = useState(0);
  const [sellCount, setSellCount] = useState(0);

  useEffect(() => {
    Promise.all([getMyOrders('buyer'), getMyOrders('seller')])
      .then(([buyerOrders, sellerOrders]) => {
        setPurchaseCount(buyerOrders.length);
        setSellCount(sellerOrders.length);
      })
      .catch(console.error);
  }, []);

  const stats = [
    { label: '上架中', value: String(listings.length).padStart(2, '0'), to: '/profile/listings' },
    { label: '購買數', value: String(purchaseCount).padStart(2, '0'), to: '/purchase-history' },
    { label: '出售數', value: String(sellCount).padStart(2, '0'), to: '/profile/selling' },
  ];

  const menuItems = [
    { label: '購買紀錄', icon: 'shopping_bag', to: '/purchase-history' },
    { label: '出售紀錄', icon: 'sell', to: '/profile/selling' },
    { label: '上架中', icon: 'list_alt', to: '/profile/listings' },
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

      <main className="pt-topbar-content px-5 space-y-8 w-full min-w-0 max-w-full">
        <section className="flex flex-col items-center">
          <div className="relative mb-4">
            <div className="rounded-full p-1 bg-gradient-to-tr from-primary to-tertiary-fixed">
              {avatarDataUrl ? (
                <img src={avatarDataUrl} alt="" className="w-24 h-24 rounded-full object-cover border-4 border-white" />
              ) : (
                <UserAvatar size="xl" className="border-4 border-white !bg-[#ededed]" />
              )}
            </div>
            <button
              type="button"
              onClick={() => navigate('/profile/edit')}
              className="absolute bottom-0 right-0 bg-primary rounded-full p-1.5 border-2 border-white"
              aria-label="編輯個人檔案"
            >
              <span className="material-symbols-outlined text-[14px] text-white" style={{ fontVariationSettings: "'FILL' 1" }}>
                edit
              </span>
            </button>
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-bold text-on-surface">{displayName || user?.displayName || '使用者'}</h2>
            <p className="text-xs font-semibold text-on-primary-container tracking-wider uppercase opacity-60">
              ID: {displayId || '—'}
            </p>
            <div className="flex items-center justify-center gap-2 mt-2 px-3 py-1 bg-white rounded-full border border-black/[0.08]">
              <span className="material-symbols-outlined text-amber-500 text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
                star
              </span>
              <span className="font-bold text-sm text-on-surface">{ratingAvg.toFixed(1)}</span>
              <span className="text-on-surface-variant text-xs">| {ratingCount} 則評價 · {transactionCount} 筆成交</span>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-3 gap-3">
          {stats.map((stat) => (
            <button
              key={stat.label}
              type="button"
              onClick={() => navigate(stat.to)}
              className="rounded-full border-2 border-outline bg-white p-4 flex flex-col items-center justify-center text-center shadow-none transition-transform active:scale-[0.98] active:bg-black/[0.02]"
              aria-label={`查看${stat.label}`}
            >
              <span className="text-2xl font-bold text-primary">{stat.value}</span>
              <span className="text-[10px] text-on-surface-variant mt-1 uppercase font-bold tracking-tighter">
                {stat.label}
              </span>
            </button>
          ))}
        </section>

        <section>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => openWantModal({})}
              aria-label="開啟想要"
              className="rounded-2xl bg-white shadow-[4px_4px_0_#111] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-transform overflow-hidden p-0 text-left flex flex-col min-h-[224px]"
            >
              <div className="relative h-[197px] w-full bg-neutral-100">
                <img
                  src="/want.svg"
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                  decoding="async"
                />
              </div>
              <div className="flex items-center justify-center px-3 py-2">
                <span className="text-base font-extrabold text-on-surface">想要</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setActiveModal('collection')}
              aria-label="開啟收藏冊"
              className="rounded-2xl bg-white shadow-[4px_4px_0_#111] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-transform overflow-hidden p-0 text-left flex flex-col min-h-[224px]"
            >
              <div className="relative h-[197px] w-full bg-neutral-100">
                <img
                  src="/my-collection.svg"
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                  decoding="async"
                />
              </div>
              <div className="flex items-center justify-center px-3 py-2">
                <span className="text-base font-extrabold text-on-surface">收藏冊</span>
              </div>
            </button>
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-3xl overflow-hidden border-2 border-outline bg-white shadow-none">
            {menuItems.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => navigate(item.to)}
                className="w-full flex items-center justify-between p-4 border-b border-black/[0.06] last:border-0 text-left active:bg-black/[0.03]"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center text-on-surface-variant">
                    <span className="material-symbols-outlined">{item.icon}</span>
                  </div>
                  <span className="text-sm font-semibold text-on-surface">{item.label}</span>
                </div>
                <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
              </button>
            ))}
          </div>

          <div className="rounded-3xl overflow-hidden border-2 border-outline bg-white shadow-none">
            <button
              type="button"
              onClick={() => navigate('/profile/edit')}
              className="w-full flex items-center justify-between p-4 text-left active:bg-black/[0.03]"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center text-on-surface-variant">
                  <span className="material-symbols-outlined">manage_accounts</span>
                </div>
                <span className="text-sm font-semibold text-on-surface">帳號設定</span>
              </div>
              <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
            </button>
          </div>
        </section>

        <CollectionTreeModal
          open={activeModal === 'collection'}
          onClose={() => setActiveModal(null)}
          collection={collection}
        />

        <section className="pb-8 space-y-3">
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
          {user && (
            <p className="text-center text-[10px] text-on-surface-variant">{user.email}</p>
          )}
          <button
            type="button"
            onClick={() => {
              logout();
              navigate('/login', { replace: true });
            }}
            className="w-full py-3 rounded-full text-sm font-bold bg-white border border-black/[0.12] text-on-surface-variant"
          >
            登出
          </button>
        </section>
      </main>
    </div>
  );
}
